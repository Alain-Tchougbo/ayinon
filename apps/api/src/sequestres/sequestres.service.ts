import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleUtilisateur, StatutCession, StatutSequestre, TypeOperationAudit, type DeclarerSequestreDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUSION_SEQUESTRE = {
  convention: { select: { id: true, montantFcfa: true, statutCession: true, vendeurNom: true, acquereurNom: true, parcelle: { select: { nup: true, commune: true } } } },
  declarePar: { select: { id: true, nomComplet: true } },
  confirmePar: { select: { id: true, nomComplet: true } },
} as const;

/**
 * Sequestre en pur suivi de statut (Epic 5) : aucun mouvement d'argent reel, ni mobile money, ni
 * virement, ni carte (voir docs/decisions.md — un vrai sequestre demanderait une integration avec
 * un prestataire de paiement reglemente, hors sujet ici). L'acheteur declare un depot, un agent
 * banque confirme l'encaissement declare. Liberation et remboursement ne sont jamais decides ici :
 * ils decoulent automatiquement du sort de la cession (voir CessionsService.valider/repondre).
 */
@Injectable()
export class SequestresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async declarer(dto: DeclarerSequestreDto, acheteur: UtilisateurAuthentifie) {
    const convention = await this.prisma.convention.findUnique({ where: { id: dto.conventionId } });
    if (!convention) {
      throw new NotFoundException("Cession introuvable");
    }
    if (convention.acquereurId !== acheteur.id) {
      throw new ForbiddenException("Seul l'acquereur designe sur cette cession peut y declarer un depot");
    }
    if (convention.statutCession !== StatutCession.ACCEPTEE) {
      throw new BadRequestException("Un depot ne peut etre declare que sur une cession deja acceptee par l'acquereur");
    }

    const existant = await this.prisma.sequestre.findUnique({ where: { conventionId: dto.conventionId } });
    if (existant) {
      throw new BadRequestException("Un depot a deja ete declare pour cette cession");
    }

    const sequestre = await this.prisma.sequestre.create({
      data: { conventionId: dto.conventionId, montantFcfa: dto.montantFcfa, declareParId: acheteur.id },
      include: INCLUSION_SEQUESTRE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: convention.parcelleId,
      typeOperation: TypeOperationAudit.DECLARATION_SEQUESTRE,
      acteurId: acheteur.id,
      roleActeur: acheteur.role as RoleUtilisateur,
      payload: { sequestreId: sequestre.id, conventionId: dto.conventionId, montantFcfa: dto.montantFcfa },
    });

    return sequestre;
  }

  async confirmer(id: string, agent: UtilisateurAuthentifie) {
    const sequestre = await this.prisma.sequestre.findUnique({ where: { id } });
    if (!sequestre) {
      throw new NotFoundException("Sequestre introuvable");
    }
    if (sequestre.statut !== StatutSequestre.DEPOT_DECLARE) {
      throw new BadRequestException("Ce depot n'est plus en attente de confirmation");
    }

    const confirme = await this.prisma.sequestre.update({
      where: { id },
      data: { statut: StatutSequestre.DEPOT_CONFIRME, confirmeParId: agent.id, dateConfirmation: new Date() },
      include: INCLUSION_SEQUESTRE,
    });

    await this.cryptoAudit.enregistrer({
      typeOperation: TypeOperationAudit.CONFIRMATION_SEQUESTRE,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { sequestreId: id, conventionId: sequestre.conventionId },
    });

    return confirme;
  }

  async aConfirmer() {
    return this.prisma.sequestre.findMany({
      where: { statut: StatutSequestre.DEPOT_DECLARE },
      include: INCLUSION_SEQUESTRE,
      orderBy: { dateDeclaration: "asc" },
    });
  }

  async mesSequestres(acheteurId: string) {
    return this.prisma.sequestre.findMany({
      where: { declareParId: acheteurId },
      include: INCLUSION_SEQUESTRE,
      orderBy: { createdAt: "desc" },
    });
  }
}
