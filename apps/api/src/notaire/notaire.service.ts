import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Espace Notaire : le role existe dans le RBAC depuis l'origine (autorise sur POST /conventions et
 * PATCH /conventions/:id/invalider) mais n'avait aucun tableau de bord dedie (voir
 * docs/decisions.md, "Notaire"). Ce module expose uniquement la visibilite en lecture necessaire
 * pour retrouver une convention a sceller ou invalider — pas de calcul de frais notaries ni d'arbre
 * genealogique, qui resteraient a construire sur des regles non sourcees.
 */
@Injectable()
export class NotaireService {
  constructor(private readonly prisma: PrismaService) {}

  async listerDocuments() {
    const [conventions, titres] = await Promise.all([
      this.prisma.convention.findMany({
        select: {
          id: true,
          vendeurNom: true,
          acquereurNom: true,
          montantFcfa: true,
          statutCession: true,
          valide: true,
          createdAt: true,
          parcelle: { select: { id: true, nup: true, commune: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.titre.findMany({
        select: { id: true, numeroTitre: true, dateDelivrance: true, parcelle: { select: { id: true, nup: true } } },
        orderBy: { dateDelivrance: "desc" },
        take: 50,
      }),
    ]);
    return { conventions, titres };
  }
}
