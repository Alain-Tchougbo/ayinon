import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  RoleUtilisateur,
  StatutAnnonce,
  StatutSignalement,
  TypeOperationAudit,
  TypeSignalement,
  type DeposerSignalementDto,
  type QualifierSignalementDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUSION_SIGNALEMENT = {
  parcelle: { select: { id: true, nup: true, commune: true, poleTerritorial: true } },
  annonce: { select: { id: true, statut: true } },
  signalant: { select: { id: true, nomComplet: true, role: true } },
  qualifiePar: { select: { id: true, nomComplet: true } },
} as const;

/**
 * Signalements (E2.6/E2.7 pour une annonce, E8.1/E8.2 pour un litige foncier plus large) : tout
 * signalement est depose par un utilisateur identifie (traçabilite, ET.6), puis qualifie par un
 * admin. Un signalement ANNONCE fonde entraine le retrait direct de l'annonce (moderation). Un
 * signalement LITIGE_FONCIER fonde ne gele jamais lui-meme la parcelle : il alimente uniquement la
 * file du magistrat CSAF, seul habilite a ordonner un gel conservatoire (separation des autorites,
 * voir ET.8 et CsafService.gelerParcelle).
 */
@Injectable()
export class SignalementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async deposer(dto: DeposerSignalementDto, signalant: UtilisateurAuthentifie) {
    let parcelleId = dto.parcelleId;

    if (dto.annonceId) {
      const annonce = await this.prisma.annonce.findUnique({ where: { id: dto.annonceId } });
      if (!annonce) {
        throw new NotFoundException("Annonce introuvable");
      }
      parcelleId = annonce.parcelleId;
    }
    if (!parcelleId) {
      throw new BadRequestException("parcelleId ou annonceId requis");
    }
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }

    const signalement = await this.prisma.signalement.create({
      data: {
        type: dto.type,
        parcelleId,
        annonceId: dto.annonceId,
        motif: dto.motif,
        descriptif: dto.descriptif,
        signalantId: signalant.id,
      },
      include: INCLUSION_SIGNALEMENT,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId,
      typeOperation: TypeOperationAudit.DEPOT_SIGNALEMENT,
      acteurId: signalant.id,
      roleActeur: signalant.role as RoleUtilisateur,
      payload: { signalementId: signalement.id, type: dto.type, annonceId: dto.annonceId ?? null },
    });

    return signalement;
  }

  async mesSignalements(signalantId: string) {
    return this.prisma.signalement.findMany({
      where: { signalantId },
      include: INCLUSION_SIGNALEMENT,
      orderBy: { createdAt: "desc" },
    });
  }

  async lister(statut?: StatutSignalement) {
    return this.prisma.signalement.findMany({
      where: statut ? { statut } : undefined,
      include: INCLUSION_SIGNALEMENT,
      orderBy: { createdAt: "desc" },
    });
  }

  /** E8.2 : uniquement consulte par le magistrat CSAF pour decider d'un gel, jamais applique automatiquement. */
  async litigesFondes() {
    return this.prisma.signalement.findMany({
      where: { type: TypeSignalement.LITIGE_FONCIER, statut: StatutSignalement.FONDE },
      include: INCLUSION_SIGNALEMENT,
      orderBy: { traiteLe: "desc" },
    });
  }

  async qualifier(id: string, dto: QualifierSignalementDto, admin: UtilisateurAuthentifie) {
    const signalement = await this.prisma.signalement.findUnique({ where: { id } });
    if (!signalement) {
      throw new NotFoundException("Signalement introuvable");
    }
    if (signalement.statut !== StatutSignalement.DEPOSE) {
      throw new BadRequestException("Ce signalement a deja ete qualifie");
    }

    const nouveauStatut = dto.fonde ? StatutSignalement.FONDE : StatutSignalement.REJETE;
    const traiteLe = new Date();

    const misAJour = await this.prisma.signalement.update({
      where: { id },
      data: { statut: nouveauStatut, qualifieParId: admin.id, decisionMotif: dto.motif, traiteLe },
      include: INCLUSION_SIGNALEMENT,
    });

    // Un signalement ANNONCE fonde releve de la moderation : l'admin peut retirer directement
    // l'annonce (contrairement a un gel de parcelle, qui reste reserve au magistrat CSAF).
    if (dto.fonde && signalement.type === TypeSignalement.ANNONCE && signalement.annonceId) {
      await this.prisma.annonce.updateMany({
        where: { id: signalement.annonceId, statut: StatutAnnonce.ACTIVE },
        data: { statut: StatutAnnonce.RETIREE, retireeLe: traiteLe },
      });
    }

    await this.cryptoAudit.enregistrer({
      parcelleId: signalement.parcelleId,
      typeOperation: TypeOperationAudit.QUALIFICATION_SIGNALEMENT,
      acteurId: admin.id,
      roleActeur: admin.role as RoleUtilisateur,
      payload: { signalementId: id, fonde: dto.fonde, motif: dto.motif },
    });

    return misAJour;
  }
}
