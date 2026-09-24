import { BadRequestException } from "@nestjs/common";
import type { GeoJsonPolygon } from "@ayinon/shared";
import { GeometreService } from "./geometre.service";

const POLYGONE_EXEMPLE: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [2.42, 6.36],
      [2.43, 6.36],
      [2.43, 6.37],
      [2.42, 6.37],
      [2.42, 6.36],
    ],
  ],
};

function creerServiceAvecConflits(conflits: Array<{ id: string; nup: string; aireIntersectionM2: number }>) {
  const executeRawAppels: unknown[] = [];
  const auditAppels: unknown[] = [];

  const prisma = {
    parcelle: {
      findUnique: async () => ({ id: "parcelle-1", nup: "BJ-0001" }),
    },
    planBornage: {
      findUnique: async ({ where }: any) =>
        where.id === "plan-avec-conflit"
          ? { id: "plan-avec-conflit", chevauchementDetecte: true, hashSha256: "ab".repeat(32), signeParId: null }
          : { id: "plan-ok", parcelleId: "parcelle-1", chevauchementDetecte: false, hashSha256: "cd".repeat(32), signeParId: null },
      update: async ({ data }: any) => ({ id: "plan-ok", ...data }),
    },
    $queryRaw: async () => conflits,
    $executeRaw: async (...args: unknown[]) => {
      executeRawAppels.push(args);
      return 1;
    },
  };

  const cryptoAudit = {
    hashPayload: () => "ff".repeat(32),
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
    signerDonnees: () => "signature-test",
  };

  const service = new GeometreService(prisma as any, cryptoAudit as any);
  return { service, executeRawAppels, auditAppels };
}

describe("GeometreService — detection de chevauchement geometrique", () => {
  it("marque le plan comme conforme quand aucune parcelle mitoyenne n'intersecte", async () => {
    const { service, auditAppels } = creerServiceAvecConflits([]);

    const resultat = await service.importerBornage({
      parcelleId: "parcelle-1",
      geometrie: POLYGONE_EXEMPLE,
      referenceDossier: "DOSSIER-001",
    });

    expect(resultat.chevauchementDetecte).toBe(false);
    expect(resultat.parcellesEnConflit).toHaveLength(0);
    // Un seul evenement d'audit (IMPORT_BORNAGE), pas de DETECTION_CHEVAUCHEMENT.
    expect(auditAppels).toHaveLength(1);
  });

  it("detecte et journalise un chevauchement avec une parcelle mitoyenne", async () => {
    const { service, auditAppels } = creerServiceAvecConflits([
      { id: "parcelle-voisine", nup: "BJ-0002", aireIntersectionM2: 12.5 },
    ]);

    const resultat = await service.importerBornage({
      parcelleId: "parcelle-1",
      geometrie: POLYGONE_EXEMPLE,
      referenceDossier: "DOSSIER-002",
    });

    expect(resultat.chevauchementDetecte).toBe(true);
    expect(resultat.parcellesEnConflit).toEqual([{ id: "parcelle-voisine", nup: "BJ-0002", aireIntersectionM2: 12.5 }]);
    expect(auditAppels).toHaveLength(2);
  });

  it("refuse la signature d'un plan tant qu'un chevauchement n'est pas resolu", async () => {
    const { service } = creerServiceAvecConflits([]);

    await expect(
      service.signerPlan(
        { planBornageId: "plan-avec-conflit", numeroOrdreOgeb: "OGEB-123" },
        { id: "geometre-1", email: "g@ayinon.bj", role: "GEOMETRE", proprietaireId: null } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
