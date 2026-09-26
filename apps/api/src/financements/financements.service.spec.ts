import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StatutDemandeFinancement } from "@ayinon/shared";
import { FinancementsService } from "./financements.service";

const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", nomComplet: "Acheteur Test" } as any;
const AGENT_BANQUE = { id: "agent-1", role: "AGENT_BANQUE", nomComplet: "Agent Test" } as any;

function creerService(options: { demande?: Record<string, unknown> | null } = {}) {
  let demande: Record<string, unknown> | null = options.demande ?? null;
  const auditAppels: unknown[] = [];

  const prisma = {
    demandeFinancement: {
      create: async ({ data }: any) => {
        demande = { id: "demande-1", statut: StatutDemandeFinancement.EN_ATTENTE, dateConsultation: null, ...data };
        return demande;
      },
      findMany: async () => (demande ? [demande] : []),
      findUnique: async ({ where }: any) => {
        if (!demande) {
          return null;
        }
        if (where.id && where.id !== (demande as Record<string, unknown>).id) {
          return null;
        }
        if (where.codeVerification && where.codeVerification !== (demande as Record<string, unknown>).codeVerification) {
          return null;
        }
        return { ...(demande as Record<string, unknown>), acheteur: { nomComplet: ACHETEUR.nomComplet } };
      },
      update: async ({ data }: any) => {
        demande = { ...(demande as Record<string, unknown>), ...data };
        return demande;
      },
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new FinancementsService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirDemande: () => demande };
}

describe("FinancementsService — dossier de financement bancaire (E4.6-E4.9)", () => {
  it("cree une demande de financement et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const demande = await service.demander({ montantSouhaiteFcfa: 5_000_000 } as any, undefined, ACHETEUR);
    expect((demande as any).statut).toBe(StatutDemandeFinancement.EN_ATTENTE);
    expect(auditAppels).toHaveLength(1);
  });

  it("horodate la consultation une seule fois, a la premiere ouverture", async () => {
    const { service, obtenirDemande, auditAppels } = creerService({
      demande: { id: "demande-1", acheteurId: ACHETEUR.id, montantSouhaiteFcfa: 5_000_000, statut: StatutDemandeFinancement.EN_ATTENTE, dateConsultation: null },
    });
    await service.obtenirParId("demande-1", AGENT_BANQUE);
    const premiereConsultation = (obtenirDemande() as any).dateConsultation;
    expect(premiereConsultation).toBeInstanceOf(Date);
    expect(auditAppels).toHaveLength(1);

    await service.obtenirParId("demande-1", AGENT_BANQUE);
    expect((obtenirDemande() as any).dateConsultation).toBe(premiereConsultation);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse de traiter une demande introuvable", async () => {
    const { service } = creerService();
    await expect(service.traiter("inconnu", { decision: "ACCORD_PRINCIPE", montantAccordeFcfa: 1 } as any, AGENT_BANQUE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("refuse de traiter une demande deja traitee", async () => {
    const { service } = creerService({
      demande: { id: "demande-1", acheteurId: ACHETEUR.id, montantSouhaiteFcfa: 5_000_000, statut: StatutDemandeFinancement.ACCORD_PRINCIPE },
    });
    await expect(service.traiter("demande-1", { decision: "REFUSER", motifRefus: "Deja traitee" } as any, AGENT_BANQUE)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("accorde un principe de financement et genere un code de verification", async () => {
    const { service, obtenirDemande, auditAppels } = creerService({
      demande: { id: "demande-1", acheteurId: ACHETEUR.id, montantSouhaiteFcfa: 5_000_000, statut: StatutDemandeFinancement.EN_ATTENTE },
    });
    const misAJour = await service.traiter("demande-1", { decision: "ACCORD_PRINCIPE", montantAccordeFcfa: 4_500_000 } as any, AGENT_BANQUE);
    expect((misAJour as any).statut).toBe(StatutDemandeFinancement.ACCORD_PRINCIPE);
    expect((misAJour as any).codeVerification).toMatch(/^[0-9A-F]{8}$/);
    expect((obtenirDemande() as any).montantAccordeFcfa).toBe(4_500_000);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse une demande avec motif et sans code de verification", async () => {
    const { service, obtenirDemande } = creerService({
      demande: { id: "demande-1", acheteurId: ACHETEUR.id, montantSouhaiteFcfa: 5_000_000, statut: StatutDemandeFinancement.EN_ATTENTE },
    });
    await service.traiter("demande-1", { decision: "REFUSER", motifRefus: "Revenus insuffisants" } as any, AGENT_BANQUE);
    expect((obtenirDemande() as any).statut).toBe(StatutDemandeFinancement.REFUSEE);
    expect((obtenirDemande() as any).codeVerification).toBeNull();
  });

  it("verifie un code valide d'un accord de principe", async () => {
    const { service } = creerService({
      demande: {
        id: "demande-1",
        acheteurId: ACHETEUR.id,
        montantSouhaiteFcfa: 5_000_000,
        statut: StatutDemandeFinancement.ACCORD_PRINCIPE,
        montantAccordeFcfa: 4_500_000,
        codeVerification: "ABCD1234",
        dateTraitement: new Date("2026-09-25T10:00:00Z"),
      },
    });
    const resultat = await service.verifierCode("ABCD1234");
    expect(resultat.valide).toBe(true);
  });

  it("renvoie invalide pour un code inconnu", async () => {
    const { service } = creerService();
    const resultat = await service.verifierCode("INCONNU1");
    expect(resultat.valide).toBe(false);
  });
});
