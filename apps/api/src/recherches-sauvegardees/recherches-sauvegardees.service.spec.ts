import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { StatutAnnonce } from "@ayinon/shared";
import { RecherchesSauvegardeesService } from "./recherches-sauvegardees.service";

const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", nomComplet: "Acheteur Test" } as any;
const AUTRE_ACHETEUR = { id: "acheteur-2", role: "ACHETEUR", nomComplet: "Autre Acheteur" } as any;

function creerService(options: { recherche?: Record<string, unknown> | null; nombreAnnoncesCorrespondantes?: number } = {}) {
  let recherche: Record<string, unknown> | null = options.recherche ?? null;
  let dernierWhereCount: unknown = null;

  const prisma = {
    rechercheSauvegardee: {
      create: async ({ data }: any) => {
        recherche = { id: "recherche-1", createdAt: new Date(), derniereConsultation: new Date(), ...data };
        return recherche;
      },
      findMany: async () => (recherche ? [recherche] : []),
      findUnique: async () => recherche,
      update: async ({ data }: any) => {
        recherche = { ...(recherche as Record<string, unknown>), ...data };
        return recherche;
      },
      delete: async () => {
        recherche = null;
        return {};
      },
    },
    annonce: {
      count: async ({ where }: any) => {
        dernierWhereCount = where;
        return options.nombreAnnoncesCorrespondantes ?? 0;
      },
    },
  };

  const service = new RecherchesSauvegardeesService(prisma as any);
  return { service, obtenirRecherche: () => recherche, obtenirDernierWhereCount: () => dernierWhereCount };
}

describe("RecherchesSauvegardeesService — recherche sauvegardee avec alerte (E3.2)", () => {
  it("sauvegarde une recherche avec ses filtres", async () => {
    const { service, obtenirRecherche } = creerService();
    await service.sauvegarder({ nom: "Terrains a Cotonou", commune: "Cotonou", prixMaxFcfa: 10_000_000 } as any, ACHETEUR);
    expect((obtenirRecherche() as any).nom).toBe("Terrains a Cotonou");
    expect((obtenirRecherche() as any).acheteurId).toBe(ACHETEUR.id);
  });

  it("compte les nouvelles annonces correspondantes depuis la derniere consultation", async () => {
    const { service, obtenirDernierWhereCount } = creerService({
      recherche: {
        id: "recherche-1",
        acheteurId: ACHETEUR.id,
        commune: "Cotonou",
        prixMinFcfa: null,
        prixMaxFcfa: 10_000_000,
        superficieMinM2: null,
        superficieMaxM2: null,
        verifieeAndf: true,
        derniereConsultation: new Date("2026-09-01T00:00:00Z"),
      },
      nombreAnnoncesCorrespondantes: 3,
    });
    const recherches = await service.mesRecherches(ACHETEUR.id);
    expect((recherches[0] as any).nombreNouvelles).toBe(3);
    const where = obtenirDernierWhereCount() as any;
    expect(where.statut).toBe(StatutAnnonce.ACTIVE);
    expect(where.createdAt).toEqual({ gt: new Date("2026-09-01T00:00:00Z") });
    expect(where.verifieeParAndfId).toEqual({ not: null });
  });

  it("remet a zero le compteur d'alerte a la consultation", async () => {
    const { service, obtenirRecherche } = creerService({
      recherche: { id: "recherche-1", acheteurId: ACHETEUR.id, derniereConsultation: new Date("2026-09-01T00:00:00Z") },
    });
    await service.consulter("recherche-1", ACHETEUR);
    expect((obtenirRecherche() as any).derniereConsultation).not.toEqual(new Date("2026-09-01T00:00:00Z"));
  });

  it("refuse de consulter la recherche sauvegardee d'un autre acheteur", async () => {
    const { service } = creerService({ recherche: { id: "recherche-1", acheteurId: ACHETEUR.id } });
    await expect(service.consulter("recherche-1", AUTRE_ACHETEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse de supprimer une recherche sauvegardee introuvable", async () => {
    const { service } = creerService();
    await expect(service.supprimer("inconnue", ACHETEUR)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("supprime sa propre recherche sauvegardee", async () => {
    const { service, obtenirRecherche } = creerService({ recherche: { id: "recherche-1", acheteurId: ACHETEUR.id } });
    await service.supprimer("recherche-1", ACHETEUR);
    expect(obtenirRecherche()).toBeNull();
  });
});
