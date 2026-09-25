import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleUtilisateur, StatutAnnonce, StatutVisite, TypeOperationAudit, type DemanderVisiteDto, type RepondreVisiteDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const INCLUSION_VISITE = {
  annonce: {
    select: {
      id: true,
      statut: true,
      publieeParId: true,
      parcelle: { select: { nup: true, commune: true } },
      publieePar: { select: { nomComplet: true } },
    },
  },
  acheteur: { select: { id: true, nomComplet: true } },
} as const;

/**
 * Demande de visite (E3.5/E3.6) : l'acheteur propose un creneau sur une annonce active, le
 * vendeur confirme/refuse/reprogramme. Pas de delegation a un accompagnateur de terrain (aucun
 * role dedie n'existe pour ca) ni d'integration de visioconference reelle dans cette iteration
 * (voir docs/decisions.md).
 */
@Injectable()
export class VisitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async demander(annonceId: string, dto: DemanderVisiteDto, acheteur: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id: annonceId } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }
    if (annonce.publieeParId === acheteur.id) {
      throw new BadRequestException("Vous ne pouvez pas demander une visite sur votre propre annonce");
    }

    const visite = await this.prisma.visite.create({
      data: { annonceId, acheteurId: acheteur.id, mode: dto.mode, dateProposee: dto.dateProposee, messageAcheteur: dto.message },
      include: INCLUSION_VISITE,
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.DEMANDE_VISITE,
      acteurId: acheteur.id,
      roleActeur: acheteur.role as RoleUtilisateur,
      payload: { visiteId: visite.id, annonceId, dateProposee: dto.dateProposee.toISOString() },
    });

    return visite;
  }

  async mesVisitesDemandees(acheteurId: string) {
    return this.prisma.visite.findMany({ where: { acheteurId }, include: INCLUSION_VISITE, orderBy: { createdAt: "desc" } });
  }

  async visitesRecues(vendeurId: string) {
    return this.prisma.visite.findMany({
      where: { annonce: { publieeParId: vendeurId } },
      include: INCLUSION_VISITE,
      orderBy: { createdAt: "desc" },
    });
  }

  async repondre(id: string, dto: RepondreVisiteDto, utilisateur: UtilisateurAuthentifie) {
    const visite = await this.prisma.visite.findUnique({ where: { id }, include: { annonce: true } });
    if (!visite) {
      throw new NotFoundException("Demande de visite introuvable");
    }
    const estVendeur = visite.annonce.publieeParId === utilisateur.id;
    const estAcheteur = visite.acheteurId === utilisateur.id;

    let donnees: Record<string, unknown>;
    if (visite.statut === StatutVisite.DEMANDEE) {
      if (!estVendeur) {
        throw new ForbiddenException("Seul le vendeur peut repondre a cette demande de visite");
      }
      if (dto.decision === "REPROGRAMMER") {
        donnees = { statut: StatutVisite.REPROGRAMMEE, nouvelleDateProposee: dto.nouvelleDate };
      } else if (dto.decision === "CONFIRMER") {
        donnees = { statut: StatutVisite.CONFIRMEE, traiteeLe: new Date() };
      } else {
        donnees = { statut: StatutVisite.REFUSEE, motifRefus: dto.motifRefus, traiteeLe: new Date() };
      }
    } else if (visite.statut === StatutVisite.REPROGRAMMEE) {
      if (!estAcheteur) {
        throw new ForbiddenException("Seul l'acheteur peut repondre a la nouvelle date proposee");
      }
      if (dto.decision === "REPROGRAMMER") {
        throw new BadRequestException("Seul le vendeur peut proposer une nouvelle date");
      }
      donnees =
        dto.decision === "CONFIRMER"
          ? { statut: StatutVisite.CONFIRMEE, dateProposee: visite.nouvelleDateProposee!, traiteeLe: new Date() }
          : { statut: StatutVisite.REFUSEE, motifRefus: dto.motifRefus, traiteeLe: new Date() };
    } else {
      throw new BadRequestException("Cette demande de visite a deja ete traitee");
    }

    const misAJour = await this.prisma.visite.update({ where: { id }, data: donnees, include: INCLUSION_VISITE });

    await this.cryptoAudit.enregistrer({
      parcelleId: visite.annonce.parcelleId,
      typeOperation: TypeOperationAudit.REPONSE_VISITE,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { visiteId: id, decision: dto.decision },
    });

    return misAJour;
  }
}
