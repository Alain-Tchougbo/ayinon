import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RoleUtilisateur, StatutCession, TypeOperationAudit, type DeposerAvisDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Avis reciproque en fin de transaction (E7.7) : chaque partie d'une cession VALIDEE peut noter
 * une seule fois l'autre partie. Publie immediatement des le depot (pas de file de moderation
 * prealable dans cette iteration, voir docs/decisions.md) mais uniquement depose par l'une des
 * deux parties reelles de la Convention consideree, jamais librement par un tiers.
 */
@Injectable()
export class AvisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async deposer(dto: DeposerAvisDto, auteur: UtilisateurAuthentifie) {
    const convention = await this.prisma.convention.findUnique({ where: { id: dto.conventionId } });
    if (!convention) {
      throw new NotFoundException("Cession introuvable");
    }
    if (convention.statutCession !== StatutCession.VALIDEE) {
      throw new BadRequestException("Seule une cession validee peut etre notee");
    }

    let citeId: string;
    if (convention.acquereurId === auteur.id) {
      if (!convention.creeParId) {
        throw new BadRequestException("Aucun vendeur identifie sur cette cession");
      }
      citeId = convention.creeParId;
    } else if (convention.creeParId === auteur.id) {
      if (!convention.acquereurId) {
        throw new BadRequestException("Aucun acquereur identifie sur cette cession");
      }
      citeId = convention.acquereurId;
    } else {
      throw new ForbiddenException("Vous n'etes pas partie a cette cession");
    }

    const dejaNote = await this.prisma.avis.findUnique({
      where: { conventionId_auteurId: { conventionId: dto.conventionId, auteurId: auteur.id } },
    });
    if (dejaNote) {
      throw new BadRequestException("Vous avez deja note cette transaction");
    }

    const avis = await this.prisma.avis.create({
      data: { conventionId: dto.conventionId, note: dto.note, commentaire: dto.commentaire, auteurId: auteur.id, citeId },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: convention.parcelleId,
      typeOperation: TypeOperationAudit.DEPOT_AVIS,
      acteurId: auteur.id,
      roleActeur: auteur.role as RoleUtilisateur,
      payload: { avisId: avis.id, conventionId: dto.conventionId, note: dto.note },
    });

    return avis;
  }

  /** E3.4 : profil public consultable avant de contacter un vendeur (anciennete, ventes conclues, avis). */
  async profil(utilisateurId: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: { id: true, nomComplet: true, role: true, createdAt: true },
    });
    if (!utilisateur) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    const avis = await this.prisma.avis.findMany({
      where: { citeId: utilisateurId },
      include: { auteur: { select: { nomComplet: true } } },
      orderBy: { createdAt: "desc" },
    });
    const ventesConclues = await this.prisma.convention.count({ where: { creeParId: utilisateurId, statutCession: StatutCession.VALIDEE } });
    const noteMoyenne = avis.length > 0 ? Math.round((avis.reduce((somme, a) => somme + a.note, 0) / avis.length) * 10) / 10 : null;

    return {
      utilisateur: { id: utilisateur.id, nomComplet: utilisateur.nomComplet, role: utilisateur.role, membreDepuisLe: utilisateur.createdAt },
      noteMoyenne,
      nombreAvis: avis.length,
      ventesConclues,
      avis: avis.map((a) => ({ note: a.note, commentaire: a.commentaire, auteurNom: a.auteur.nomComplet, createdAt: a.createdAt })),
    };
  }
}
