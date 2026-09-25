import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  RoleUtilisateur,
  StatutAnnonce,
  StatutCession,
  StatutParcelle,
  TypeOperationAudit,
  type ProposerCessionDto,
  type RepondreCessionDto,
  type ValiderCessionDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { CsafService } from "../csaf/csaf.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUSION_CESSION = {
  parcelle: true,
  acquereur: { select: { id: true, nomComplet: true, email: true } },
  validePar: { select: { id: true, nomComplet: true } },
  titre: true,
} as const;

/**
 * Parcours d'achat/vente citoyen-a-citoyen : le vendeur propose, l'acquereur accepte ou refuse,
 * un agent ANDF valide (ou rejette) et la validation delivre un Titre numerique en transferant la
 * propriete de la parcelle. Reutilise le modele Convention existant (le meme qui sert au Scanner
 * Anti-Fraude) pour que toute cession reste, des sa creation, un document scelle SHA-256+Ed25519.
 */
@Injectable()
export class CessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
    private readonly csaf: CsafService,
  ) {}

  async proposer(dto: ProposerCessionDto, vendeur: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    if (!vendeur.proprietaireId || parcelle.proprietaireId !== vendeur.proprietaireId) {
      throw new ForbiddenException("Seul le proprietaire enregistre peut proposer la cession de cette parcelle");
    }
    if (parcelle.verrouAntiVente) {
      throw new ForbiddenException("Parcelle verrouillee contre la vente : deverrouillez-la depuis votre passeport foncier avant de proposer une cession");
    }
    await this.csaf.verifierParcelleNonGelee(dto.parcelleId);

    const acquereur = await this.prisma.utilisateur.findUnique({ where: { email: dto.acquereurEmail } });
    if (!acquereur || acquereur.role !== RoleUtilisateur.ACHETEUR) {
      throw new NotFoundException("Aucun compte acheteur trouve pour cet email : l'acquereur doit d'abord creer un compte AYINON en tant qu'acheteur");
    }
    if (acquereur.id === vendeur.id) {
      throw new BadRequestException("Vous ne pouvez pas vous proposer une cession a vous-meme");
    }

    const donnees = {
      parcelleId: dto.parcelleId,
      vendeurId: vendeur.id,
      acquereurId: acquereur.id,
      montantFcfa: dto.montantFcfa,
      horodatage: new Date().toISOString(),
    };
    const hashSha256 = createHash("sha256").update(JSON.stringify(donnees)).digest("hex");
    const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(hashSha256, "hex"));

    const convention = await this.prisma.convention.create({
      data: {
        parcelleId: dto.parcelleId,
        vendeurNom: vendeur.nomComplet,
        acquereurNom: acquereur.nomComplet,
        montantFcfa: dto.montantFcfa,
        hashSha256,
        signatureEd25519,
        qrPayload: {},
        statutCession: StatutCession.PROPOSEE,
        creeParId: vendeur.id,
        acquereurId: acquereur.id,
      },
      include: INCLUSION_CESSION,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.PROPOSITION_CESSION,
      acteurId: vendeur.id,
      roleActeur: vendeur.role as RoleUtilisateur,
      payload: { conventionId: convention.id, acquereurId: acquereur.id, montantFcfa: dto.montantFcfa },
    });

    return convention;
  }

  async mesPropositionsRecues(utilisateurId: string) {
    return this.prisma.convention.findMany({
      where: { acquereurId: utilisateurId, statutCession: StatutCession.PROPOSEE },
      include: INCLUSION_CESSION,
      orderBy: { createdAt: "desc" },
    });
  }

  async mesCessionsEmises(utilisateurId: string) {
    return this.prisma.convention.findMany({
      where: { creeParId: utilisateurId },
      include: INCLUSION_CESSION,
      orderBy: { createdAt: "desc" },
    });
  }

  async aValider() {
    return this.prisma.convention.findMany({
      where: { statutCession: StatutCession.ACCEPTEE },
      include: INCLUSION_CESSION,
      orderBy: { dateAcceptation: "asc" },
    });
  }

  async obtenirParId(id: string, utilisateur: UtilisateurAuthentifie) {
    const convention = await this.prisma.convention.findUnique({ where: { id }, include: INCLUSION_CESSION });
    if (!convention) {
      throw new NotFoundException("Cession introuvable");
    }
    const estPartiePrenante = convention.creeParId === utilisateur.id || convention.acquereurId === utilisateur.id;
    const rolesAutoriteFonciere: RoleUtilisateur[] = [RoleUtilisateur.AGENT_ANDF, RoleUtilisateur.MAGISTRAT_CSAF, RoleUtilisateur.ADMIN];
    const estAutoriteFonciere = rolesAutoriteFonciere.includes(utilisateur.role as RoleUtilisateur);
    if (!estPartiePrenante && !estAutoriteFonciere) {
      throw new ForbiddenException("Vous n'etes pas partie a cette cession");
    }
    return convention;
  }

  async repondre(id: string, dto: RepondreCessionDto, acquereur: UtilisateurAuthentifie) {
    const convention = await this.prisma.convention.findUnique({ where: { id } });
    if (!convention) {
      throw new NotFoundException("Cession introuvable");
    }
    if (convention.acquereurId !== acquereur.id) {
      throw new ForbiddenException("Seul l'acquereur designe peut repondre a cette proposition");
    }
    if (convention.statutCession !== StatutCession.PROPOSEE) {
      throw new BadRequestException("Cette proposition a deja ete traitee");
    }
    if (!dto.accepter && !dto.motifRefus) {
      throw new BadRequestException("Un motif est requis pour refuser une proposition de cession");
    }

    const miseAJour = await this.prisma.convention.update({
      where: { id },
      data: dto.accepter
        ? { statutCession: StatutCession.ACCEPTEE, dateAcceptation: new Date() }
        : { statutCession: StatutCession.REJETEE, motifRejet: dto.motifRefus },
      include: INCLUSION_CESSION,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: convention.parcelleId,
      typeOperation: dto.accepter ? TypeOperationAudit.ACCEPTATION_CESSION : TypeOperationAudit.REJET_CESSION,
      acteurId: acquereur.id,
      roleActeur: acquereur.role as RoleUtilisateur,
      payload: { conventionId: id, motifRefus: dto.motifRefus ?? null },
    });

    return miseAJour;
  }

  async valider(id: string, dto: ValiderCessionDto, agent: UtilisateurAuthentifie) {
    const convention = await this.prisma.convention.findUnique({ where: { id } });
    if (!convention) {
      throw new NotFoundException("Cession introuvable");
    }
    if (convention.statutCession !== StatutCession.ACCEPTEE) {
      throw new BadRequestException("Seule une cession acceptee par l'acquereur peut etre validee");
    }
    if (!dto.approuver && !dto.motifRejet) {
      throw new BadRequestException("Un motif est requis pour rejeter une cession");
    }

    if (!dto.approuver) {
      const rejetee = await this.prisma.convention.update({
        where: { id },
        data: { statutCession: StatutCession.REJETEE, motifRejet: dto.motifRejet, valideParId: agent.id, dateValidation: new Date() },
        include: INCLUSION_CESSION,
      });
      await this.cryptoAudit.enregistrer({
        parcelleId: convention.parcelleId,
        typeOperation: TypeOperationAudit.REJET_CESSION,
        acteurId: agent.id,
        roleActeur: agent.role as RoleUtilisateur,
        payload: { conventionId: id, motifRejet: dto.motifRejet ?? null },
      });
      return rejetee;
    }

    await this.csaf.verifierParcelleNonGelee(convention.parcelleId);
    if (!convention.acquereurId) {
      throw new BadRequestException("Cession sans acquereur identifie : impossible de valider");
    }

    const { convention: validee, titre } = await this.prisma.$transaction(async (tx) => {
      const acquereur = await tx.utilisateur.findUniqueOrThrow({ where: { id: convention.acquereurId! } });

      let proprietaireId = acquereur.proprietaireId;
      if (!proprietaireId) {
        const nouveauProprietaire = await tx.proprietaire.create({
          data: { nomComplet: acquereur.nomComplet, email: acquereur.email, telephone: acquereur.telephone },
        });
        await tx.utilisateur.update({ where: { id: acquereur.id }, data: { proprietaireId: nouveauProprietaire.id } });
        proprietaireId = nouveauProprietaire.id;
      }

      await tx.parcelle.update({
        where: { id: convention.parcelleId },
        data: { proprietaireId, statut: StatutParcelle.TITREE, verrouAntiVente: false },
      });

      const numeroSequence = (await tx.titre.count()) + 1;
      const numeroTitre = `BJ-TITRE-${new Date().getFullYear()}-${String(numeroSequence).padStart(6, "0")}`;
      const dateDelivrance = new Date();
      const donneesTitre = { parcelleId: convention.parcelleId, proprietaireId, numeroTitre, dateDelivrance: dateDelivrance.toISOString() };
      const hashSha256 = createHash("sha256").update(JSON.stringify(donneesTitre)).digest("hex");
      const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(hashSha256, "hex"));

      const titreCree = await tx.titre.create({
        data: { parcelleId: convention.parcelleId, numeroTitre, dateDelivrance, hashSha256, signatureEd25519, conventionId: id },
      });

      const conventionValidee = await tx.convention.update({
        where: { id },
        data: { statutCession: StatutCession.VALIDEE, valideParId: agent.id, dateValidation: dateDelivrance },
        include: INCLUSION_CESSION,
      });

      // Cession issue de la vitrine (E6) : l'annonce d'origine ne doit plus apparaitre comme active
      // une fois la vente actee, sinon d'autres acheteurs pourraient manifester leur interet sur une
      // parcelle deja transferee.
      if (convention.annonceId) {
        await tx.annonce.update({ where: { id: convention.annonceId }, data: { statut: StatutAnnonce.VENDUE } });
      }

      return { convention: conventionValidee, titre: titreCree };
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: convention.parcelleId,
      typeOperation: TypeOperationAudit.VALIDATION_CESSION,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { conventionId: id },
    });
    await this.cryptoAudit.enregistrer({
      parcelleId: convention.parcelleId,
      typeOperation: TypeOperationAudit.DELIVRANCE_TITRE,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { conventionId: id, titreId: titre.id, numeroTitre: titre.numeroTitre },
    });

    return validee;
  }
}
