import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  RoleUtilisateur,
  StatutCession,
  StatutConflitCsaf,
  StatutParcelle,
  TypeDecisionCsaf,
  TypeOperationAudit,
  type GelConservatoireDto,
  type LeveeGelDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const DOSSIER_DECISIONS = join(process.cwd(), "uploads", "decisions-csaf");

/**
 * Bouton de Gel Conservatoire Judiciaire : en un appel, un magistrat CSAF place une parcelle
 * contestee sous sequestre. Son statut passe instantanement en GEL_CSAF (rouge) sur l'ensemble
 * du territoire national, ce qui bloque toute mutation/vente (voir verifierParcelleNonGelee,
 * consomme par ConventionsService et FamillesService).
 */
@Injectable()
export class CsafService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async gelerParcelle(dto: GelConservatoireDto, magistrat: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    if (parcelle.statut === StatutParcelle.GEL_CSAF) {
      throw new BadRequestException("Cette parcelle est deja sous gel conservatoire");
    }

    const [conflit] = await this.prisma.$transaction([
      this.prisma.conflitCsaf.create({
        data: {
          parcelleId: dto.parcelleId,
          motif: dto.motif,
          referenceDossierJudiciaire: dto.referenceDossierJudiciaire,
          statutParcelleAvantGel: parcelle.statut,
          ouvertParId: magistrat.id,
        },
      }),
      this.prisma.parcelle.update({ where: { id: dto.parcelleId }, data: { statut: StatutParcelle.GEL_CSAF } }),
    ]);

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.GEL_CSAF,
      acteurId: magistrat.id,
      roleActeur: magistrat.role as RoleUtilisateur,
      payload: { conflitId: conflit.id, motif: dto.motif, referenceDossierJudiciaire: dto.referenceDossierJudiciaire },
    });

    return conflit;
  }

  /** E8.8 : la levee porte la decision definitive du magistrat. LEVEE_SIMPLE restaure juste le
   * statut anterieur ; ANNULATION_VENTE/TRANSFERT_FORCE annulent en plus toute cession/annonce en
   * cours sur la parcelle, TRANSFERT_FORCE reassignant directement la propriete au nom designe. */
  async leverGel(dto: LeveeGelDto, fichier: Express.Multer.File | undefined, magistrat: UtilisateurAuthentifie) {
    const conflit = await this.prisma.conflitCsaf.findUnique({ where: { id: dto.conflitId } });
    if (!conflit) {
      throw new NotFoundException("Conflit CSAF introuvable");
    }
    if (conflit.statut !== StatutConflitCsaf.ACTIF) {
      throw new BadRequestException("Ce gel a deja ete leve");
    }

    let cheminDecision: string | null = null;
    if (fichier) {
      await mkdir(DOSSIER_DECISIONS, { recursive: true });
      const hash = createHash("sha256").update(fichier.buffer).digest("hex");
      const nomFichier = `${hash}${extname(fichier.originalname) || ".pdf"}`;
      await writeFile(join(DOSSIER_DECISIONS, nomFichier), fichier.buffer);
      cheminDecision = join("uploads", "decisions-csaf", nomFichier);
    }

    const invalideMutationsEnCours = dto.typeDecision !== TypeDecisionCsaf.LEVEE_SIMPLE;

    const conflitLeve = await this.prisma.$transaction(async (tx) => {
      const misAJour = await tx.conflitCsaf.update({
        where: { id: dto.conflitId },
        data: { statut: StatutConflitCsaf.LEVE, dateLevee: new Date(), motifLevee: dto.motifLevee, typeDecision: dto.typeDecision, cheminDecision },
      });

      if (dto.typeDecision === TypeDecisionCsaf.TRANSFERT_FORCE) {
        const nouveauProprietaire = await tx.proprietaire.create({ data: { nomComplet: dto.nouveauProprietaireNom! } });
        await tx.parcelle.update({
          where: { id: conflit.parcelleId },
          data: { proprietaireId: nouveauProprietaire.id, statut: StatutParcelle.TITREE, verrouAntiVente: false },
        });
      } else {
        await tx.parcelle.update({ where: { id: conflit.parcelleId }, data: { statut: conflit.statutParcelleAvantGel } });
      }

      if (invalideMutationsEnCours) {
        await tx.convention.updateMany({
          where: { parcelleId: conflit.parcelleId, statutCession: { in: [StatutCession.PROPOSEE, StatutCession.ACCEPTEE] } },
          data: { statutCession: StatutCession.REJETEE, motifRejet: `Annulee par decision CSAF : ${dto.motifLevee}` },
        });
        await tx.annonce.updateMany({
          where: { parcelleId: conflit.parcelleId, statut: "ACTIVE" },
          data: { statut: "RETIREE", retireeLe: new Date() },
        });
      }

      return misAJour;
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: conflit.parcelleId,
      typeOperation:
        dto.typeDecision === TypeDecisionCsaf.TRANSFERT_FORCE
          ? TypeOperationAudit.DECISION_CSAF_TRANSFERT_FORCE
          : dto.typeDecision === TypeDecisionCsaf.ANNULATION_VENTE
            ? TypeOperationAudit.DECISION_CSAF_ANNULATION_VENTE
            : TypeOperationAudit.LEVEE_GEL_CSAF,
      acteurId: magistrat.id,
      roleActeur: magistrat.role as RoleUtilisateur,
      payload: { conflitId: dto.conflitId, motifLevee: dto.motifLevee, typeDecision: dto.typeDecision },
    });

    return conflitLeve;
  }

  async listerConflitsActifs() {
    return this.prisma.conflitCsaf.findMany({
      where: { statut: StatutConflitCsaf.ACTIF },
      include: { parcelle: { select: { nup: true, commune: true, poleTerritorial: true } } },
      orderBy: { dateGel: "desc" },
    });
  }

  /** A appeler avant toute operation de mutation (vente, multi-signature, ...) sur une parcelle. */
  async verifierParcelleNonGelee(parcelleId: string) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: parcelleId } });
    if (parcelle?.statut === StatutParcelle.GEL_CSAF) {
      throw new ForbiddenException("Parcelle sous gel conservatoire judiciaire (CSAF) : operation bloquee");
    }
  }
}
