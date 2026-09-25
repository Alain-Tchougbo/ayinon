import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { StatutCession, StatutSequestre } from "@ayinon/shared";
import { SequestresService } from "./sequestres.service";

const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", nomComplet: "Acheteur Test" } as any;
const AUTRE_ACHETEUR = { id: "acheteur-2", role: "ACHETEUR", nomComplet: "Autre Acheteur" } as any;
const AGENT_BANQUE = { id: "banque-1", role: "AGENT_BANQUE", nomComplet: "Agent Banque" } as any;

function creerService(
  options: { convention?: Record<string, unknown> | null; sequestre?: Record<string, unknown> | null } = {},
) {
  const convention =
    options.convention === null
      ? null
      : { id: "convention-1", parcelleId: "parcelle-1", statutCession: StatutCession.ACCEPTEE, acquereurId: ACHETEUR.id, ...options.convention };
  let sequestre: Record<string, unknown> | null = options.sequestre ?? null;
  const auditAppels: unknown[] = [];

  const prisma = {
    convention: { findUnique: async () => convention },
    sequestre: {
      findUnique: async () => sequestre,
      create: async ({ data }: any) => {
        sequestre = { id: "sequestre-1", statut: StatutSequestre.DEPOT_DECLARE, ...data };
        return sequestre;
      },
      update: async ({ data }: any) => {
        sequestre = { ...(sequestre as Record<string, unknown>), ...data };
        return sequestre;
      },
      findMany: async () => (sequestre ? [sequestre] : []),
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new SequestresService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirSequestre: () => sequestre };
}

describe("SequestresService — suivi de statut sans mouvement d'argent reel", () => {
  it("refuse qu'un autre acheteur declare un depot sur une cession qui n'est pas la sienne", async () => {
    const { service } = creerService();
    await expect(service.declarer({ conventionId: "convention-1", montantFcfa: 1_000_000 }, AUTRE_ACHETEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse un depot sur une cession pas encore acceptee", async () => {
    const { service } = creerService({ convention: { statutCession: StatutCession.PROPOSEE } });
    await expect(service.declarer({ conventionId: "convention-1", montantFcfa: 1_000_000 }, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("declare un depot et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const sequestre = await service.declarer({ conventionId: "convention-1", montantFcfa: 1_000_000 }, ACHETEUR);
    expect((sequestre as any).statut).toBe(StatutSequestre.DEPOT_DECLARE);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse un second depot sur la meme cession", async () => {
    const { service } = creerService({ sequestre: { id: "sequestre-1", conventionId: "convention-1" } });
    await expect(service.declarer({ conventionId: "convention-1", montantFcfa: 1_000_000 }, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("confirme un depot declare", async () => {
    const { service, obtenirSequestre } = creerService({
      sequestre: { id: "sequestre-1", conventionId: "convention-1", statut: StatutSequestre.DEPOT_DECLARE },
    });
    await service.confirmer("sequestre-1", AGENT_BANQUE);
    expect((obtenirSequestre() as any).statut).toBe(StatutSequestre.DEPOT_CONFIRME);
  });

  it("refuse de confirmer un depot introuvable", async () => {
    const { service } = creerService();
    await expect(service.confirmer("inconnu", AGENT_BANQUE)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuse de confirmer un depot deja confirme", async () => {
    const { service } = creerService({ sequestre: { id: "sequestre-1", conventionId: "convention-1", statut: StatutSequestre.DEPOT_CONFIRME } });
    await expect(service.confirmer("sequestre-1", AGENT_BANQUE)).rejects.toBeInstanceOf(BadRequestException);
  });
});
