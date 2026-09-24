import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  RoleUtilisateur,
  StatutConflitCsaf,
  StatutParcelle,
  TypeOperationAudit,
  type GelConservatoireDto,
  type LeveeGelDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

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

  async leverGel(dto: LeveeGelDto, magistrat: UtilisateurAuthentifie) {
    const conflit = await this.prisma.conflitCsaf.findUnique({ where: { id: dto.conflitId } });
    if (!conflit) {
      throw new NotFoundException("Conflit CSAF introuvable");
    }
    if (conflit.statut !== StatutConflitCsaf.ACTIF) {
      throw new BadRequestException("Ce gel a deja ete leve");
    }

    const [conflitLeve] = await this.prisma.$transaction([
      this.prisma.conflitCsaf.update({
        where: { id: dto.conflitId },
        data: { statut: StatutConflitCsaf.LEVE, dateLevee: new Date(), motifLevee: dto.motifLevee },
      }),
      this.prisma.parcelle.update({
        where: { id: conflit.parcelleId },
        data: { statut: conflit.statutParcelleAvantGel },
      }),
    ]);

    await this.cryptoAudit.enregistrer({
      parcelleId: conflit.parcelleId,
      typeOperation: TypeOperationAudit.LEVEE_GEL_CSAF,
      acteurId: magistrat.id,
      roleActeur: magistrat.role as RoleUtilisateur,
      payload: { conflitId: dto.conflitId, motifLevee: dto.motifLevee },
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
