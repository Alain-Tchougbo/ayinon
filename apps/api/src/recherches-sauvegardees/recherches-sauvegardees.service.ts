import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { StatutAnnonce, type SauvegarderRechercheDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Recherche sauvegardee avec alerte (E3.2) : les memes filtres combinables que la vitrine,
 * figes au moment de l'enregistrement. "Alerte" = in-app uniquement (nombre de nouvelles
 * annonces correspondantes depuis la derniere consultation) ; aucune passerelle SMS/email/push
 * reelle n'est integree (voir docs/decisions.md, "Notifications"). Feature de confort personnel,
 * sans portee legale : contrairement aux operations sur une parcelle/transaction, elle n'est pas
 * journalisee dans le registre d'audit crypto.
 */
@Injectable()
export class RecherchesSauvegardeesService {
  constructor(private readonly prisma: PrismaService) {}

  async sauvegarder(dto: SauvegarderRechercheDto, acheteur: UtilisateurAuthentifie) {
    return this.prisma.rechercheSauvegardee.create({
      data: {
        acheteurId: acheteur.id,
        nom: dto.nom,
        commune: dto.commune,
        prixMinFcfa: dto.prixMinFcfa,
        prixMaxFcfa: dto.prixMaxFcfa,
        superficieMinM2: dto.superficieMinM2,
        superficieMaxM2: dto.superficieMaxM2,
        verifieeAndf: dto.verifieeAndf,
        limitesCertifiees: dto.limitesCertifiees,
      },
    });
  }

  async mesRecherches(acheteurId: string) {
    const recherches = await this.prisma.rechercheSauvegardee.findMany({
      where: { acheteurId },
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(recherches.map(async (recherche) => ({ ...recherche, nombreNouvelles: await this.compterNouvelles(recherche) })));
  }

  /** L'acheteur consulte ses resultats : remet le compteur d'alerte a zero pour cette recherche. */
  async consulter(id: string, acheteur: UtilisateurAuthentifie) {
    const recherche = await this.obtenirSiProprietaire(id, acheteur);
    return this.prisma.rechercheSauvegardee.update({ where: { id: recherche.id }, data: { derniereConsultation: new Date() } });
  }

  async supprimer(id: string, acheteur: UtilisateurAuthentifie) {
    const recherche = await this.obtenirSiProprietaire(id, acheteur);
    await this.prisma.rechercheSauvegardee.delete({ where: { id: recherche.id } });
  }

  private async obtenirSiProprietaire(id: string, acheteur: UtilisateurAuthentifie) {
    const recherche = await this.prisma.rechercheSauvegardee.findUnique({ where: { id } });
    if (!recherche) {
      throw new NotFoundException("Recherche sauvegardee introuvable");
    }
    if (recherche.acheteurId !== acheteur.id) {
      throw new ForbiddenException("Cette recherche sauvegardee ne vous appartient pas");
    }
    return recherche;
  }

  /** Meme logique de filtre que AnnoncesService.listerActives, a l'exception de
   * "limitesCertifiees" : badge derive du plan de bornage (pas une colonne), non filtrable
   * directement en base — ignore ici pour un simple comptage, comme dans lerActives ou il
   * s'applique apres coup sur la liste chargee. */
  private async compterNouvelles(recherche: {
    commune: string | null;
    prixMinFcfa: number | null;
    prixMaxFcfa: number | null;
    superficieMinM2: number | null;
    superficieMaxM2: number | null;
    verifieeAndf: boolean | null;
    derniereConsultation: Date;
  }) {
    return this.prisma.annonce.count({
      where: {
        statut: StatutAnnonce.ACTIVE,
        createdAt: { gt: recherche.derniereConsultation },
        parcelle: {
          commune: recherche.commune ? { equals: recherche.commune, mode: "insensitive" } : undefined,
          superficieM2:
            recherche.superficieMinM2 !== null || recherche.superficieMaxM2 !== null
              ? { gte: recherche.superficieMinM2 ?? undefined, lte: recherche.superficieMaxM2 ?? undefined }
              : undefined,
        },
        prixIndicatifFcfa:
          recherche.prixMinFcfa !== null || recherche.prixMaxFcfa !== null
            ? { gte: recherche.prixMinFcfa ?? undefined, lte: recherche.prixMaxFcfa ?? undefined }
            : undefined,
        verifieeParAndfId: recherche.verifieeAndf ? { not: null } : undefined,
      },
    });
  }
}
