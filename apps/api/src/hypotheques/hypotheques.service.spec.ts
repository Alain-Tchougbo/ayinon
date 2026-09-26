import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { StatutHypotheque, StatutParcelle } from "@ayinon/shared";
import { HypothequesService } from "./hypotheques.service";

const AGENT_BANQUE = { id: "banque-1", email: "banque@ayinon.bj", role: "AGENT_BANQUE", proprietaireId: null, nomComplet: "Agent Banque" } as any;
const AUTRE_BANQUE = { id: "banque-2", email: "autre@ayinon.bj", role: "AGENT_BANQUE", proprietaireId: null, nomComplet: "Autre Banque" } as any;
const ADMIN = { id: "admin-1", email: "admin@ayinon.bj", role: "ADMIN", proprietaireId: null, nomComplet: "Admin" } as any;

function creerService(options: {
  possedeTitre?: boolean;
  geleeCsaf?: boolean;
  hypothequeActiveExistante?: Record<string, unknown> | null;
} = {}) {
  const parcelle = {
    id: "parcelle-1",
    nup: "BJ-LIT-COT-0001",
    commune: "Cotonou",
    superficieM2: 500,
    statut: options.geleeCsaf ? StatutParcelle.GEL_CSAF : StatutParcelle.TITREE,
  };
  const titres = options.possedeTitre === false ? [] : [{ id: "titre-1" }];
  const hypothequesActives = options.hypothequeActiveExistante ? [options.hypothequeActiveExistante] : [];
  const auditAppels: unknown[] = [];
  let hypotheque: Record<string, unknown> | null = options.hypothequeActiveExistante ?? null;

  const prisma = {
    parcelle: {
      findUnique: async () => ({ ...parcelle, titres, hypotheques: hypothequesActives }),
    },
    hypotheque: {
      create: async ({ data }: any) => {
        hypotheque = { id: "hypotheque-1", statut: StatutHypotheque.ACTIVE, ...data };
        return hypotheque;
      },
      findMany: async () => (hypotheque ? [hypotheque] : []),
      findUnique: async () => hypotheque,
      update: async ({ data }: any) => {
        hypotheque = { ...(hypotheque as Record<string, unknown>), ...data };
        return hypotheque;
      },
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new HypothequesService(prisma as any, cryptoAudit as any);
  return { service, auditAppels };
}

describe("HypothequesService — solvabilite et inscription de gages bancaires", () => {
  it("declare eligible au credit une parcelle titree, non gelee et libre de gage", async () => {
    const { service } = creerService();

    const resultat = await service.verifierSolvabilite("BJ-LIT-COT-0001");

    expect(resultat.eligibleCredit).toBe(true);
    expect(resultat.possedeTitre).toBe(true);
    expect(resultat.libreDeGage).toBe(true);
  });

  it("declare non eligible une parcelle sans titre foncier", async () => {
    const { service } = creerService({ possedeTitre: false });

    const resultat = await service.verifierSolvabilite("BJ-LIT-COT-0001");

    expect(resultat.eligibleCredit).toBe(false);
    expect(resultat.possedeTitre).toBe(false);
  });

  it("declare non eligible une parcelle sous gel conservatoire (CSAF)", async () => {
    const { service } = creerService({ geleeCsaf: true });

    const resultat = await service.verifierSolvabilite("BJ-LIT-COT-0001");

    expect(resultat.eligibleCredit).toBe(false);
    expect(resultat.geleeCsaf).toBe(true);
  });

  it("refuse d'inscrire une hypotheque sur une parcelle sans titre", async () => {
    const { service } = creerService({ possedeTitre: false });

    await expect(
      service.inscrire({ parcelleId: "parcelle-1", banqueNom: "Banque Test", montantGarantiFcfa: 1_000_000 }, AGENT_BANQUE),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse d'inscrire une hypotheque sur une parcelle gelee (CSAF)", async () => {
    const { service } = creerService({ geleeCsaf: true });

    await expect(
      service.inscrire({ parcelleId: "parcelle-1", banqueNom: "Banque Test", montantGarantiFcfa: 1_000_000 }, AGENT_BANQUE),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse un double gage sur une parcelle deja hypothequee", async () => {
    const { service } = creerService({ hypothequeActiveExistante: { id: "existante", statut: StatutHypotheque.ACTIVE } });

    await expect(
      service.inscrire({ parcelleId: "parcelle-1", banqueNom: "Autre Banque", montantGarantiFcfa: 1_000_000 }, AGENT_BANQUE),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("inscrit une hypotheque et journalise l'audit quand tout est valide", async () => {
    const { service, auditAppels } = creerService();

    const hypotheque = await service.inscrire({ parcelleId: "parcelle-1", banqueNom: "Microfinance ALAFIA", montantGarantiFcfa: 2_000_000 }, AGENT_BANQUE);

    expect(hypotheque.statut).toBe(StatutHypotheque.ACTIVE);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse qu'une autre banque leve un gage qu'elle n'a pas inscrit", async () => {
    const { service } = creerService({ hypothequeActiveExistante: { id: "hyp-1", statut: StatutHypotheque.ACTIVE, inscriteParId: AGENT_BANQUE.id } });

    await expect(service.lever("hyp-1", { motifLevee: "Credit rembourse integralement" }, AUTRE_BANQUE)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permet a un administrateur de lever le gage d'une autre banque", async () => {
    const { service } = creerService({ hypothequeActiveExistante: { id: "hyp-1", statut: StatutHypotheque.ACTIVE, inscriteParId: AGENT_BANQUE.id } });

    const levee = await service.lever("hyp-1", { motifLevee: "Credit rembourse integralement" }, ADMIN);

    expect(levee.statut).toBe(StatutHypotheque.LEVEE);
  });
});
