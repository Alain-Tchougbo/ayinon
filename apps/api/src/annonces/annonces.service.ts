import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  RoleUtilisateur,
  StatutAnnonce,
  StatutCession,
  StatutInteret,
  TypeOperationAudit,
  type CreerAnnonceDto,
  type ManifesterInteretDto,
  type RetenirInteretDto,
  type VerifierAnnonceDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { CsafService } from "../csaf/csaf.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUSION_ANNONCE = {
  parcelle: { select: { id: true, nup: true, commune: true, arrondissement: true, superficieM2: true, statut: true, poleTerritorial: true } },
  publieePar: { select: { id: true, nomComplet: true } },
  verifieeParAndf: { select: { id: true, nomComplet: true } },
  interets: { include: { acheteur: { select: { id: true, nomComplet: true } } } },
} as const;

/**
 * Vitrine publique (Epic 1-3 du backlog) : un VENDEUR publie une parcelle qu'il possede, visible
 * sans compte comme la carte cadastrale ; un ACHETEUR manifeste son interet ; le vendeur retient
 * un interet, ce qui scelle immediatement une cession (statut ACCEPTEE) qui rejoint ensuite le
 * pipeline de validation ANDF deja existant (voir apps/api/src/cessions).
 */
@Injectable()
export class AnnoncesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
    private readonly csaf: CsafService,
  ) {}

  async creer(dto: CreerAnnonceDto, vendeur: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    if (!vendeur.proprietaireId || parcelle.proprietaireId !== vendeur.proprietaireId) {
      throw new ForbiddenException("Seul le proprietaire enregistre peut publier une annonce sur cette parcelle");
    }
    if (parcelle.verrouAntiVente) {
      throw new ForbiddenException("Parcelle verrouillee contre la vente : deverrouillez-la depuis votre passeport foncier avant de publier");
    }
    await this.csaf.verifierParcelleNonGelee(dto.parcelleId);

    const dejaActive = await this.prisma.annonce.findFirst({ where: { parcelleId: dto.parcelleId, statut: StatutAnnonce.ACTIVE } });
    if (dejaActive) {
      throw new BadRequestException("Cette parcelle a deja une annonce active");
    }

    const annonce = await this.prisma.annonce.create({
      data: {
        parcelleId: dto.parcelleId,
        prixIndicatifFcfa: dto.prixIndicatifFcfa,
        description: dto.description,
        publieeParId: vendeur.id,
      },
      include: INCLUSION_ANNONCE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.PUBLICATION_ANNONCE,
      acteurId: vendeur.id,
      roleActeur: vendeur.role as RoleUtilisateur,
      payload: { annonceId: annonce.id, prixIndicatifFcfa: dto.prixIndicatifFcfa ?? null },
    });

    return this.avecBadges(annonce);
  }

  async listerActives() {
    const annonces = await this.prisma.annonce.findMany({
      where: { statut: StatutAnnonce.ACTIVE },
      include: INCLUSION_ANNONCE,
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(annonces.map((a) => this.avecBadges(a)));
  }

  async obtenirParId(id: string) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id }, include: INCLUSION_ANNONCE });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    return this.avecBadges(annonce);
  }

  async mesAnnonces(vendeurId: string) {
    const annonces = await this.prisma.annonce.findMany({
      where: { publieeParId: vendeurId },
      include: INCLUSION_ANNONCE,
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(annonces.map((a) => this.avecBadges(a)));
  }

  async retirer(id: string, vendeur: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.publieeParId !== vendeur.id) {
      throw new ForbiddenException("Seul le vendeur ayant publie cette annonce peut la retirer");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }

    const retiree = await this.prisma.annonce.update({
      where: { id },
      data: { statut: StatutAnnonce.RETIREE, retireeLe: new Date() },
      include: INCLUSION_ANNONCE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.RETRAIT_ANNONCE,
      acteurId: vendeur.id,
      roleActeur: vendeur.role as RoleUtilisateur,
      payload: { annonceId: id },
    });

    return this.avecBadges(retiree);
  }

  async manifesterInteret(annonceId: string, dto: ManifesterInteretDto, acheteur: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id: annonceId } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }
    if (annonce.publieeParId === acheteur.id) {
      throw new BadRequestException("Vous ne pouvez pas manifester votre interet sur votre propre annonce");
    }

    const dejaManifeste = await this.prisma.interetAchat.findUnique({
      where: { annonceId_acheteurId: { annonceId, acheteurId: acheteur.id } },
    });
    if (dejaManifeste) {
      throw new BadRequestException("Vous avez deja manifeste votre interet sur cette annonce");
    }

    const interet = await this.prisma.interetAchat.create({
      data: { annonceId, acheteurId: acheteur.id, message: dto.message },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.MANIFESTATION_INTERET,
      acteurId: acheteur.id,
      roleActeur: acheteur.role as RoleUtilisateur,
      payload: { annonceId, interetId: interet.id },
    });

    return interet;
  }

  async mesInterets(acheteurId: string) {
    return this.prisma.interetAchat.findMany({
      where: { acheteurId },
      include: { annonce: { include: INCLUSION_ANNONCE } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Le vendeur retient un interet (E4.3) : scelle immediatement une cession ACCEPTEE, qui rejoint
   * le pipeline de validation ANDF deja existant sans aucune modification de CessionsService. */
  async retenirInteret(annonceId: string, interetId: string, dto: RetenirInteretDto, vendeur: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id: annonceId } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.publieeParId !== vendeur.id) {
      throw new ForbiddenException("Seul le vendeur ayant publie cette annonce peut retenir un interet");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }
    const interet = await this.prisma.interetAchat.findUnique({ where: { id: interetId }, include: { acheteur: true } });
    if (!interet || interet.annonceId !== annonceId) {
      throw new NotFoundException("Manifestation d'interet introuvable");
    }
    if (interet.statut !== StatutInteret.EN_ATTENTE) {
      throw new BadRequestException("Cet interet a deja ete traite");
    }
    await this.csaf.verifierParcelleNonGelee(annonce.parcelleId);

    await this.prisma.$transaction([
      this.prisma.interetAchat.update({ where: { id: interetId }, data: { statut: StatutInteret.RETENU } }),
      this.prisma.interetAchat.updateMany({
        where: { annonceId, id: { not: interetId }, statut: StatutInteret.EN_ATTENTE },
        data: { statut: StatutInteret.DECLINE },
      }),
    ]);

    const donnees = {
      annonceId,
      parcelleId: annonce.parcelleId,
      vendeurId: vendeur.id,
      acquereurId: interet.acheteurId,
      montantFcfa: dto.montantFcfa,
      horodatage: new Date().toISOString(),
    };
    const hashSha256 = createHash("sha256").update(JSON.stringify(donnees)).digest("hex");
    const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(hashSha256, "hex"));

    const convention = await this.prisma.convention.create({
      data: {
        parcelleId: annonce.parcelleId,
        annonceId,
        vendeurNom: vendeur.nomComplet,
        acquereurNom: interet.acheteur.nomComplet,
        montantFcfa: dto.montantFcfa,
        hashSha256,
        signatureEd25519,
        qrPayload: {},
        statutCession: StatutCession.ACCEPTEE,
        dateAcceptation: new Date(),
        creeParId: vendeur.id,
        acquereurId: interet.acheteurId,
      },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.RETENUE_INTERET,
      acteurId: vendeur.id,
      roleActeur: vendeur.role as RoleUtilisateur,
      payload: { annonceId, interetId, conventionId: convention.id, montantFcfa: dto.montantFcfa },
    });

    return convention;
  }

  /** E1.11/E2.2 : un agent ANDF verifie la situation fonciere et pose (ou refuse) le badge public. */
  async verifierParAndf(id: string, dto: VerifierAnnonceDto, agent: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (!dto.conforme && !dto.motif) {
      throw new BadRequestException("Un motif est requis en cas d'anomalie constatee");
    }

    const misAJour = await this.prisma.annonce.update({
      where: { id },
      data: dto.conforme
        ? { verifieeParAndfId: agent.id, dateVerificationAndf: new Date() }
        : { statut: StatutAnnonce.RETIREE, retireeLe: new Date() },
      include: INCLUSION_ANNONCE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.VERIFICATION_ANDF_ANNONCE,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { annonceId: id, conforme: dto.conforme, motif: dto.motif ?? null },
    });

    return this.avecBadges(misAJour);
  }

  /** E1.9 : estimation fondee sur les cessions reellement validees dans la meme commune (aucune
   * donnee inventee ; le nombre de references utilisees est toujours renvoye pour honnetete). */
  async estimerPrix(commune: string) {
    const cessionsComparables = await this.prisma.convention.findMany({
      where: { statutCession: StatutCession.VALIDEE, parcelle: { commune } },
      select: { montantFcfa: true, parcelle: { select: { superficieM2: true } } },
    });

    if (cessionsComparables.length === 0) {
      return { nombreReferences: 0, moyenneFcfaParM2: null, message: "Aucune transaction validee dans cette commune pour le moment." };
    }

    const prixParM2 = cessionsComparables.map((c) => c.montantFcfa / c.parcelle.superficieM2);
    const moyenne = prixParM2.reduce((somme, v) => somme + v, 0) / prixParM2.length;

    return {
      nombreReferences: cessionsComparables.length,
      moyenneFcfaParM2: Math.round(moyenne),
      message:
        cessionsComparables.length < 3
          ? "Estimation basee sur peu de references : a considerer avec prudence."
          : `Estimation basee sur ${cessionsComparables.length} transactions validees dans cette commune.`,
    };
  }

  /** Badge "limites certifiees" (E2.3) : jamais stocke, toujours deduit du plan de bornage reel
   * pour ne jamais desynchroniser un booleen dedie de la situation technique effective. */
  private async avecBadges<T extends { parcelleId: string }>(annonce: T) {
    const planCertifie = await this.prisma.planBornage.findFirst({
      where: { parcelleId: annonce.parcelleId, signeParId: { not: null }, chevauchementDetecte: false },
    });
    return { ...annonce, limitesCertifiees: Boolean(planCertifie) };
  }
}
