import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  RoleUtilisateur,
  StatutAnnonce,
  StatutCession,
  StatutInteret,
  TypeOperationAudit,
  type AccorderExclusiviteDto,
  type CreerAnnonceDto,
  type ManifesterInteretDto,
  type RechercheAnnonceDto,
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
  exclusiviteAcheteur: { select: { id: true, nomComplet: true } },
  interets: { include: { acheteur: { select: { id: true, nomComplet: true } } } },
  // E7.7 : id de la cession issue de cette annonce, necessaire pour que l'acheteur/le vendeur
  // puisse noter l'autre partie une fois la vente finalisee (voir AvisService). Le sequestre
  // eventuel (Epic 5) est expose au meme endroit pour eviter un appel separe. Triees par date
  // decroissante : une annonce peut accumuler plusieurs cessions dans le temps (ex. une premiere
  // rejetee par l'ANDF puis une seconde relancee avec un autre acheteur) — le frontend ne doit
  // jamais voir que la plus recente en position 0, jamais une tentative perimee.
  cessions: { orderBy: { createdAt: "desc" }, select: { id: true, statutCession: true, sequestre: true } },
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

  /** E3.1 : filtres combinables (zone, prix, superficie, niveau de verification). Le filtre
   * "limites certifiees" s'applique apres coup, car ce badge est derive (voir avecBadges) et non
   * une colonne interrogeable directement en base. */
  async listerActives(filtres: RechercheAnnonceDto = {}) {
    const annonces = await this.prisma.annonce.findMany({
      where: {
        statut: StatutAnnonce.ACTIVE,
        parcelle: {
          commune: filtres.commune ? { equals: filtres.commune, mode: "insensitive" } : undefined,
          superficieM2:
            filtres.superficieMinM2 !== undefined || filtres.superficieMaxM2 !== undefined
              ? { gte: filtres.superficieMinM2, lte: filtres.superficieMaxM2 }
              : undefined,
        },
        prixIndicatifFcfa:
          filtres.prixMinFcfa !== undefined || filtres.prixMaxFcfa !== undefined
            ? { gte: filtres.prixMinFcfa, lte: filtres.prixMaxFcfa }
            : undefined,
        verifieeParAndfId: filtres.verifieeAndf === "true" ? { not: null } : undefined,
      },
      include: INCLUSION_ANNONCE,
      orderBy: { createdAt: "desc" },
    });
    const resultats = await Promise.all(annonces.map((a) => this.avecBadges(a)));
    return filtres.limitesCertifiees === "true" ? resultats.filter((a) => a.limitesCertifiees) : resultats;
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

    // E5.7 (esprit "verrou anti double-vente") : des qu'un interet est retenu, une cession est deja
    // en cours de validation ANDF sur cette parcelle — aucune nouvelle manifestation ne doit pouvoir
    // s'y ajouter tant que l'annonce reste ACTIVE (elle ne passe VENDUE qu'a la validation).
    const dejaEnNegociation = await this.prisma.interetAchat.findFirst({ where: { annonceId, statut: StatutInteret.RETENU } });
    if (dejaEnNegociation) {
      throw new BadRequestException("Cette annonce est deja en cours de cession avec un autre acheteur");
    }

    // E4.5 : tant que l'exclusivite accordee par le vendeur n'est pas expiree, seul l'acheteur
    // qui en beneficie peut manifester son interet — leve automatiquement des que la date est
    // depassee, sans action manuelle ni tache planifiee (voir docs/decisions.md).
    if (annonce.exclusiviteAcheteurId && annonce.exclusiviteJusqua && annonce.exclusiviteJusqua > new Date() && annonce.exclusiviteAcheteurId !== acheteur.id) {
      throw new BadRequestException("Cette annonce est en negociation exclusive avec un autre acheteur pour le moment");
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
    const interets = await this.prisma.interetAchat.findMany({
      where: { acheteurId },
      include: { annonce: { include: INCLUSION_ANNONCE } },
      orderBy: { createdAt: "desc" },
    });
    // Bug trouve par verification Playwright (E4.5) : sans ce passage par avecBadges, l'annonce
    // imbriquee n'avait ni enExclusivite ni limitesCertifiees (toujours undefined cote frontend),
    // contrairement a listerActives/obtenirParId/mesAnnonces qui l'appellent deja tous.
    return Promise.all(interets.map(async (interet) => ({ ...interet, annonce: await this.avecBadges(interet.annonce) })));
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
    const dejaEnNegociation = await this.prisma.interetAchat.findFirst({ where: { annonceId, statut: StatutInteret.RETENU } });
    if (dejaEnNegociation) {
      throw new BadRequestException("Un interet est deja retenu sur cette annonce : la cession est en cours de validation ANDF");
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

  /** E4.5 : le vendeur securise une negociation serieuse en excluant temporairement les autres
   * acheteurs. L'acheteur beneficiaire doit avoir deja manifeste un interet reel (pas n'importe
   * qui) ; la levee est automatique a expiration, jamais une action manuelle a part. */
  async accorderExclusivite(annonceId: string, dto: AccorderExclusiviteDto, vendeur: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id: annonceId } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.publieeParId !== vendeur.id) {
      throw new ForbiddenException("Seul le vendeur ayant publie cette annonce peut accorder une exclusivite");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }
    const interet = await this.prisma.interetAchat.findUnique({ where: { annonceId_acheteurId: { annonceId, acheteurId: dto.acheteurId } } });
    if (!interet) {
      throw new BadRequestException("Cet acheteur n'a pas manifeste d'interet sur cette annonce");
    }

    const exclusiviteJusqua = new Date();
    exclusiviteJusqua.setDate(exclusiviteJusqua.getDate() + dto.dureeJours);

    const misAJour = await this.prisma.annonce.update({
      where: { id: annonceId },
      data: { exclusiviteAcheteurId: dto.acheteurId, exclusiviteJusqua },
      include: INCLUSION_ANNONCE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.ACCORD_EXCLUSIVITE,
      acteurId: vendeur.id,
      roleActeur: vendeur.role as RoleUtilisateur,
      payload: { annonceId, acheteurId: dto.acheteurId, dureeJours: dto.dureeJours, exclusiviteJusqua: exclusiviteJusqua.toISOString() },
    });

    return this.avecBadges(misAJour);
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
   * pour ne jamais desynchroniser un booleen dedie de la situation technique effective. Meme
   * logique pour "en exclusivite" (E4.5) : jamais un statut a part, toujours recalcule depuis la
   * date d'expiration pour se lever automatiquement sans tache planifiee. */
  private async avecBadges<T extends { parcelleId: string; exclusiviteJusqua?: Date | null }>(annonce: T) {
    const planCertifie = await this.prisma.planBornage.findFirst({
      where: { parcelleId: annonce.parcelleId, signeParId: { not: null }, chevauchementDetecte: false },
    });
    // Centre reel de la parcelle (PostGIS), pour afficher une vraie tuile satellite de
    // l'emplacement plutot qu'une illustration generique — voir CarteVignette.vue cote frontend.
    const [centre] = await this.prisma.$queryRaw<Array<{ lng: number; lat: number }>>(Prisma.sql`
      SELECT ST_X(ST_Centroid(geom)) AS lng, ST_Y(ST_Centroid(geom)) AS lat FROM "Parcelle" WHERE id = ${annonce.parcelleId}
    `);
    return {
      ...annonce,
      limitesCertifiees: Boolean(planCertifie),
      enExclusivite: Boolean(annonce.exclusiviteJusqua && annonce.exclusiviteJusqua > new Date()),
      centreParcelle: centre ?? null,
    };
  }
}
