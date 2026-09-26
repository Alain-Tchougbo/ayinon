import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleUtilisateur, StatutHypotheque, StatutParcelle, TypeOperationAudit, type InscrireHypothequeDto, type LeverHypothequeDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Verification de solvabilite hypothecaire et inscription de gages bancaires : une banque
 * verifie en un appel qu'une parcelle est titree, non gelee (CSAF) et libre de toute autre
 * hypotheque active avant d'accorder un credit, puis marque son propre gage dans le registre
 * national pour que toute autre banque le voie instantanement (fin des doubles gages caches).
 */
@Injectable()
export class HypothequesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async verifierSolvabilite(nup: string) {
    const parcelle = await this.prisma.parcelle.findUnique({
      where: { nup },
      include: { titres: true, hypotheques: { where: { statut: StatutHypotheque.ACTIVE } } },
    });
    if (!parcelle) {
      throw new NotFoundException("Aucune parcelle ne correspond a ce NUP");
    }

    const possedeTitre = parcelle.titres.length > 0;
    const geleeCsaf = parcelle.statut === StatutParcelle.GEL_CSAF;
    const libreDeGage = parcelle.hypotheques.length === 0;

    return {
      parcelle: {
        id: parcelle.id,
        nup: parcelle.nup,
        commune: parcelle.commune,
        statut: parcelle.statut,
        superficieM2: parcelle.superficieM2,
      },
      possedeTitre,
      geleeCsaf,
      libreDeGage,
      hypothequesActives: parcelle.hypotheques,
      eligibleCredit: possedeTitre && !geleeCsaf && libreDeGage,
    };
  }

  async inscrire(dto: InscrireHypothequeDto, agent: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({
      where: { id: dto.parcelleId },
      include: { titres: true, hypotheques: { where: { statut: StatutHypotheque.ACTIVE } } },
    });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    if (parcelle.titres.length === 0) {
      throw new BadRequestException("Cette parcelle n'a pas encore de titre foncier delivre : hypotheque impossible");
    }
    if (parcelle.statut === StatutParcelle.GEL_CSAF) {
      throw new ForbiddenException("Parcelle sous gel conservatoire judiciaire (CSAF) : inscription impossible");
    }
    if (parcelle.hypotheques.length > 0) {
      throw new BadRequestException("Cette parcelle porte deja une hypotheque active : un seul gage a la fois");
    }

    const hypotheque = await this.prisma.hypotheque.create({
      data: {
        parcelleId: dto.parcelleId,
        banqueNom: dto.banqueNom,
        montantGarantiFcfa: dto.montantGarantiFcfa,
        inscriteParId: agent.id,
      },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.INSCRIPTION_HYPOTHEQUE,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { hypothequeId: hypotheque.id, banqueNom: dto.banqueNom, montantGarantiFcfa: dto.montantGarantiFcfa },
    });

    return hypotheque;
  }

  async mesInscriptions(utilisateurId: string) {
    return this.prisma.hypotheque.findMany({
      where: { inscriteParId: utilisateurId },
      include: { parcelle: { select: { nup: true, commune: true } } },
      orderBy: { dateInscription: "desc" },
    });
  }

  async lever(id: string, dto: LeverHypothequeDto, agent: UtilisateurAuthentifie) {
    const hypotheque = await this.prisma.hypotheque.findUnique({ where: { id } });
    if (!hypotheque) {
      throw new NotFoundException("Hypotheque introuvable");
    }
    if (hypotheque.statut !== StatutHypotheque.ACTIVE) {
      throw new BadRequestException("Cette hypotheque est deja levee");
    }
    if (hypotheque.inscriteParId !== agent.id && agent.role !== RoleUtilisateur.ADMIN) {
      throw new ForbiddenException("Seule la banque ayant inscrit ce gage peut le lever");
    }

    const levee = await this.prisma.hypotheque.update({
      where: { id },
      data: { statut: StatutHypotheque.LEVEE, dateLevee: new Date(), motifLevee: dto.motifLevee, leveeParId: agent.id },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: hypotheque.parcelleId,
      typeOperation: TypeOperationAudit.LEVEE_HYPOTHEQUE,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { hypothequeId: id, motifLevee: dto.motifLevee },
    });

    return levee;
  }
}
