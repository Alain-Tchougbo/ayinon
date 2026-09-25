import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { StatutAnnonce, StatutInteret } from "@ayinon/shared";
import { AnnoncesService } from "./annonces.service";

const VENDEUR = { id: "vendeur-1", role: "VENDEUR", proprietaireId: "prop-vendeur", nomComplet: "Vendeur Test" } as any;
const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", proprietaireId: null, nomComplet: "Acheteur Test" } as any;

function creerService(options: {
  parcelle?: Record<string, unknown> | null;
  annonce?: Record<string, unknown> | null;
  interet?: Record<string, unknown> | null;
  parcelleGelee?: boolean;
  autreInteretRetenu?: boolean;
  annoncesListe?: Array<Record<string, unknown>>;
  parcellesLimitesCertifiees?: string[];
} = {}) {
  const parcelle =
    options.parcelle === null ? null : { id: "parcelle-1", proprietaireId: "prop-vendeur", verrouAntiVente: false, ...options.parcelle };
  let annonce: Record<string, unknown> | null = options.annonce ?? null;
  let interet: Record<string, unknown> | null = options.interet ?? null;
  const auditAppels: unknown[] = [];
  let dernierWhereListerActives: unknown = null;

  const prisma = {
    parcelle: { findUnique: async () => parcelle },
    annonce: {
      findFirst: async () => null,
      findUnique: async () => annonce,
      findMany: async ({ where }: any) => {
        dernierWhereListerActives = where;
        return options.annoncesListe ?? [];
      },
      create: async ({ data }: any) => {
        annonce = { id: "annonce-1", statut: StatutAnnonce.ACTIVE, ...data };
        return annonce;
      },
      update: async ({ data }: any) => {
        annonce = { ...(annonce as Record<string, unknown>), ...data };
        return annonce;
      },
    },
    interetAchat: {
      findUnique: async () => interet,
      findFirst: async ({ where }: any) =>
        where.statut === StatutInteret.RETENU && options.autreInteretRetenu
          ? { id: "interet-retenu-existant", annonceId: where.annonceId, statut: StatutInteret.RETENU }
          : null,
      create: async ({ data }: any) => {
        interet = { id: "interet-1", statut: StatutInteret.EN_ATTENTE, acheteur: ACHETEUR, ...data };
        return interet;
      },
      update: async ({ data }: any) => {
        interet = { ...(interet as Record<string, unknown>), ...data };
        return interet;
      },
      updateMany: async () => ({ count: 0 }),
    },
    convention: { create: async ({ data }: any) => ({ id: "convention-1", ...data }), findMany: async () => [] },
    planBornage: {
      findFirst: async ({ where }: any) =>
        options.parcellesLimitesCertifiees?.includes(where.parcelleId) ? { id: `plan-${where.parcelleId}` } : null,
    },
    $transaction: async (ops: unknown[]) => Promise.all(ops as any),
  };

  const cryptoAudit = {
    signerDonnees: () => "signature-test",
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const csaf = {
    verifierParcelleNonGelee: async () => {
      if (options.parcelleGelee) {
        throw new ForbiddenException("Parcelle sous gel conservatoire judiciaire (CSAF) : operation bloquee");
      }
    },
  };

  const service = new AnnoncesService(prisma as any, cryptoAudit as any, csaf as any);
  return { service, auditAppels, obtenirDernierWhereListerActives: () => dernierWhereListerActives };
}

describe("AnnoncesService — vitrine publique et manifestations d'interet", () => {
  it("refuse de publier une annonce si le vendeur n'est pas proprietaire", async () => {
    const { service } = creerService({ parcelle: { proprietaireId: "quelqu-un-dautre" } });
    await expect(service.creer({ parcelleId: "parcelle-1" }, VENDEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse de publier une annonce sur une parcelle verrouillee", async () => {
    const { service } = creerService({ parcelle: { verrouAntiVente: true } });
    await expect(service.creer({ parcelleId: "parcelle-1" }, VENDEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse de publier une annonce sur une parcelle gelee (CSAF)", async () => {
    const { service } = creerService({ parcelleGelee: true });
    await expect(service.creer({ parcelleId: "parcelle-1" }, VENDEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("publie une annonce et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const annonce = await service.creer({ parcelleId: "parcelle-1", prixIndicatifFcfa: 5_000_000 }, VENDEUR);
    expect(annonce.statut).toBe(StatutAnnonce.ACTIVE);
    expect(annonce.limitesCertifiees).toBe(false);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse qu'un vendeur manifeste son interet sur sa propre annonce", async () => {
    const { service } = creerService({ annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE } });
    await expect(service.manifesterInteret("annonce-1", {}, VENDEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse de manifester un interet sur une annonce retiree", async () => {
    const { service } = creerService({ annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.RETIREE } });
    await expect(service.manifesterInteret("annonce-1", {}, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse un nouvel interet si un autre est deja retenu sur l'annonce (anti double-vente)", async () => {
    const { service } = creerService({
      annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE },
      autreInteretRetenu: true,
    });
    await expect(service.manifesterInteret("annonce-1", {}, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse de retenir un interet si un autre est deja retenu sur l'annonce (anti double-vente)", async () => {
    const { service } = creerService({
      annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE },
      interet: { id: "interet-1", annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutInteret.EN_ATTENTE, acheteur: ACHETEUR },
      autreInteretRetenu: true,
    });
    await expect(
      service.retenirInteret("annonce-1", "interet-1", { montantFcfa: 10_000_000 }, VENDEUR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("retient un interet et scelle une cession ACCEPTEE des la retenue", async () => {
    const { service } = creerService({
      annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE },
      interet: { id: "interet-1", annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutInteret.EN_ATTENTE, acheteur: ACHETEUR },
    });
    const convention = await service.retenirInteret("annonce-1", "interet-1", { montantFcfa: 10_000_000 }, VENDEUR);
    expect((convention as any).statutCession).toBe("ACCEPTEE");
    expect((convention as any).annonceId).toBe("annonce-1");
  });

  it("refuse de retenir un interet deja traite", async () => {
    const { service } = creerService({
      annonce: { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE },
      interet: { id: "interet-1", annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutInteret.DECLINE, acheteur: ACHETEUR },
    });
    await expect(service.retenirInteret("annonce-1", "interet-1", { montantFcfa: 10_000_000 }, VENDEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("renvoie une estimation honnete quand aucune transaction comparable n'existe", async () => {
    const { service } = creerService();
    const estimation = await service.estimerPrix("VilleSansHistorique");
    expect(estimation.nombreReferences).toBe(0);
    expect(estimation.moyenneFcfaParM2).toBeNull();
  });

  it("construit les clauses where a partir des filtres de recherche (E3.1)", async () => {
    const { service, obtenirDernierWhereListerActives } = creerService();
    await service.listerActives({
      commune: "Cotonou",
      prixMinFcfa: 1_000_000,
      prixMaxFcfa: 5_000_000,
      superficieMinM2: 100,
      superficieMaxM2: 500,
      verifieeAndf: "true",
    });
    const where = obtenirDernierWhereListerActives() as any;
    expect(where.parcelle.commune).toEqual({ equals: "Cotonou", mode: "insensitive" });
    expect(where.parcelle.superficieM2).toEqual({ gte: 100, lte: 500 });
    expect(where.prixIndicatifFcfa).toEqual({ gte: 1_000_000, lte: 5_000_000 });
    expect(where.verifieeParAndfId).toEqual({ not: null });
  });

  it("ne filtre rien quand aucun filtre n'est fourni", async () => {
    const { service, obtenirDernierWhereListerActives } = creerService();
    await service.listerActives();
    const where = obtenirDernierWhereListerActives() as any;
    expect(where.parcelle.commune).toBeUndefined();
    expect(where.prixIndicatifFcfa).toBeUndefined();
    expect(where.verifieeParAndfId).toBeUndefined();
  });

  it("filtre sur le badge limites certifiees derive, apres coup", async () => {
    const { service } = creerService({
      annoncesListe: [
        { id: "annonce-certifiee", parcelleId: "parcelle-certifiee", statut: StatutAnnonce.ACTIVE },
        { id: "annonce-non-certifiee", parcelleId: "parcelle-non-certifiee", statut: StatutAnnonce.ACTIVE },
      ],
      parcellesLimitesCertifiees: ["parcelle-certifiee"],
    });
    const resultats = await service.listerActives({ limitesCertifiees: "true" });
    expect(resultats).toHaveLength(1);
    expect((resultats[0] as any).id).toBe("annonce-certifiee");
  });
});
