import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LeveeGelSchema, StatutConflitCsaf, StatutParcelle } from "@ayinon/shared";
import { CsafService } from "./csaf.service";

const MAGISTRAT = { id: "magistrat-1", role: "MAGISTRAT_CSAF", nomComplet: "Magistrat Test" } as any;

function creerService(options: { conflit?: Record<string, unknown> | null } = {}) {
  const conflit =
    options.conflit === null
      ? null
      : {
          id: "conflit-1",
          parcelleId: "parcelle-1",
          statut: StatutConflitCsaf.ACTIF,
          statutParcelleAvantGel: StatutParcelle.TITREE,
          ...options.conflit,
        };
  let parcelle: Record<string, unknown> = { id: "parcelle-1", statut: StatutParcelle.GEL_CSAF, proprietaireId: "prop-ancien" };
  const conventionUpdateManyAppels: unknown[] = [];
  const annonceUpdateManyAppels: unknown[] = [];
  const auditAppels: unknown[] = [];

  const prisma = {
    conflitCsaf: {
      findUnique: async () => conflit,
      update: async ({ data }: any) => ({ ...(conflit as Record<string, unknown>), ...data }),
    },
    parcelle: {
      update: async ({ data }: any) => {
        parcelle = { ...parcelle, ...data };
        return parcelle;
      },
    },
    proprietaire: {
      create: async ({ data }: any) => ({ id: "prop-nouveau", ...data }),
    },
    convention: {
      updateMany: async (args: any) => {
        conventionUpdateManyAppels.push(args);
        return { count: 0 };
      },
    },
    annonce: {
      updateMany: async (args: any) => {
        annonceUpdateManyAppels.push(args);
        return { count: 0 };
      },
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new CsafService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirParcelle: () => parcelle, conventionUpdateManyAppels, annonceUpdateManyAppels };
}

describe("CsafService.leverGel — decision definitive (E8.8)", () => {
  it("refuse une levee sur un conflit introuvable", async () => {
    const { service } = creerService({ conflit: null });
    await expect(service.leverGel({ conflitId: "x", motifLevee: "Motif de test suffisant" } as any, undefined, MAGISTRAT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("refuse de lever un gel deja leve", async () => {
    const { service } = creerService({ conflit: { statut: StatutConflitCsaf.LEVE } });
    await expect(service.leverGel({ conflitId: "conflit-1", motifLevee: "Motif de test suffisant" } as any, undefined, MAGISTRAT)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("LEVEE_SIMPLE restaure le statut anterieur sans toucher aux cessions/annonces", async () => {
    const { service, obtenirParcelle, conventionUpdateManyAppels, annonceUpdateManyAppels } = creerService();
    await service.leverGel({ conflitId: "conflit-1", motifLevee: "Litige resolu a l'amiable", typeDecision: "LEVEE_SIMPLE" } as any, undefined, MAGISTRAT);
    expect((obtenirParcelle() as any).statut).toBe(StatutParcelle.TITREE);
    expect(conventionUpdateManyAppels).toHaveLength(0);
    expect(annonceUpdateManyAppels).toHaveLength(0);
  });

  it("ANNULATION_VENTE rejette les cessions en cours et retire les annonces actives", async () => {
    const { service, conventionUpdateManyAppels, annonceUpdateManyAppels } = creerService();
    await service.leverGel(
      { conflitId: "conflit-1", motifLevee: "Vente frauduleuse averee", typeDecision: "ANNULATION_VENTE" } as any,
      undefined,
      MAGISTRAT,
    );
    expect(conventionUpdateManyAppels).toHaveLength(1);
    expect(annonceUpdateManyAppels).toHaveLength(1);
  });

  it("LeveeGelSchema (packages/shared) refuse un TRANSFERT_FORCE sans nom de proprietaire", () => {
    const resultat = LeveeGelSchema.safeParse({
      conflitId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      motifLevee: "Jugement definitif rendu",
      typeDecision: "TRANSFERT_FORCE",
    });
    expect(resultat.success).toBe(false);
  });

  it("TRANSFERT_FORCE reassigne la propriete de la parcelle et journalise l'audit dedie", async () => {
    const { service, obtenirParcelle, auditAppels } = creerService();
    await service.leverGel(
      {
        conflitId: "conflit-1",
        motifLevee: "Jugement definitif rendu en faveur du plaignant",
        typeDecision: "TRANSFERT_FORCE",
        nouveauProprietaireNom: "Plaignant Legitime",
      } as any,
      undefined,
      MAGISTRAT,
    );
    expect((obtenirParcelle() as any).proprietaireId).toBe("prop-nouveau");
    expect((obtenirParcelle() as any).statut).toBe(StatutParcelle.TITREE);
    expect(auditAppels).toHaveLength(1);
    expect((auditAppels[0] as any).typeOperation).toBe("DECISION_CSAF_TRANSFERT_FORCE");
  });
});
