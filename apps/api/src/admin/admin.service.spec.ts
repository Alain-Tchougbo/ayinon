import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminService } from "./admin.service";

const ADMIN = { id: "admin-1", role: "ADMIN", nomComplet: "Admin Test" } as any;

function creerService(options: {
  utilisateur?: Record<string, unknown> | null;
  annoncesActives?: Array<Record<string, unknown>>;
  conventionsParCommune?: Record<string, Array<{ montantFcfa: number; parcelle: { superficieM2: number } }>>;
  annonce?: Record<string, unknown> | null;
} = {}) {
  let utilisateur: Record<string, unknown> | null =
    options.utilisateur === null ? null : { id: "compte-1", statutValidationPro: "EN_ATTENTE", role: "GEOMETRE", ...options.utilisateur };
  let annonce: Record<string, unknown> | null = options.annonce ?? null;
  const auditAppels: unknown[] = [];

  const prisma = {
    utilisateur: {
      findUnique: async () => utilisateur,
      update: async ({ data }: any) => {
        utilisateur = { ...(utilisateur as Record<string, unknown>), ...data };
        return utilisateur;
      },
    },
    annonce: {
      findMany: async () => options.annoncesActives ?? [],
      findUnique: async () => annonce,
      update: async ({ data }: any) => {
        annonce = { ...(annonce as Record<string, unknown>), ...data };
        return annonce;
      },
    },
    convention: {
      findMany: async ({ where }: any) => options.conventionsParCommune?.[where.parcelle.commune] ?? [],
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new AdminService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirUtilisateur: () => utilisateur, obtenirAnnonce: () => annonce };
}

describe("AdminService.traiterDemandePro — validation des comptes professionnels (E0.6)", () => {
  it("refuse de traiter une demande introuvable", async () => {
    const { service } = creerService({ utilisateur: null });
    await expect(service.traiterDemandePro("inconnu", { approuver: true }, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("exige un motif pour rejeter une demande", async () => {
    const { service } = creerService();
    await expect(service.traiterDemandePro("compte-1", { approuver: false }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("approuve une demande et journalise l'audit", async () => {
    const { service, obtenirUtilisateur, auditAppels } = creerService();
    await service.traiterDemandePro("compte-1", { approuver: true }, ADMIN);
    expect((obtenirUtilisateur() as any).statutValidationPro).toBe("APPROUVE");
    expect(auditAppels).toHaveLength(1);
  });

  it("rejette une demande avec motif", async () => {
    const { service, obtenirUtilisateur } = creerService();
    await service.traiterDemandePro("compte-1", { approuver: false, motifRejet: "Numero d'agrement invalide" }, ADMIN);
    expect((obtenirUtilisateur() as any).statutValidationPro).toBe("REJETE");
    expect((obtenirUtilisateur() as any).motifRejetPro).toBe("Numero d'agrement invalide");
  });

  it("refuse de retraiter une demande deja traitee", async () => {
    const { service } = creerService({ utilisateur: { statutValidationPro: "APPROUVE" } });
    await expect(service.traiterDemandePro("compte-1", { approuver: true }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("AdminService.annoncesARisque — detection de prix aberrant (E1.14)", () => {
  it("signale une annonce dont le prix devie fortement de la moyenne communale (>= 3 references)", async () => {
    const { service } = creerService({
      annoncesActives: [
        {
          id: "annonce-1",
          prixIndicatifFcfa: 30_000_000,
          createdAt: new Date(),
          parcelle: { nup: "BJ-1", commune: "Cotonou", superficieM2: 300 },
          publieePar: { nomComplet: "Vendeur Test" },
        },
      ],
      conventionsParCommune: {
        Cotonou: [
          { montantFcfa: 10_000_000, parcelle: { superficieM2: 200 } },
          { montantFcfa: 9_000_000, parcelle: { superficieM2: 180 } },
          { montantFcfa: 11_000_000, parcelle: { superficieM2: 220 } },
        ],
      },
    });
    const resultats = await service.annoncesARisque();
    expect(resultats).toHaveLength(1);
    expect(resultats[0]!.id).toBe("annonce-1");
    expect(resultats[0]!.deviationPourcentage).toBeGreaterThan(50);
  });

  it("ne signale pas une annonce dont le prix reste proche de la moyenne communale", async () => {
    const { service } = creerService({
      annoncesActives: [
        {
          id: "annonce-1",
          prixIndicatifFcfa: 10_500_000,
          createdAt: new Date(),
          parcelle: { nup: "BJ-1", commune: "Cotonou", superficieM2: 210 },
          publieePar: { nomComplet: "Vendeur Test" },
        },
      ],
      conventionsParCommune: {
        Cotonou: [
          { montantFcfa: 10_000_000, parcelle: { superficieM2: 200 } },
          { montantFcfa: 9_000_000, parcelle: { superficieM2: 180 } },
          { montantFcfa: 11_000_000, parcelle: { superficieM2: 220 } },
        ],
      },
    });
    const resultats = await service.annoncesARisque();
    expect(resultats).toHaveLength(0);
  });

  it("ne signale rien quand la commune n'a pas assez de references fiables (< 3)", async () => {
    const { service } = creerService({
      annoncesActives: [
        {
          id: "annonce-1",
          prixIndicatifFcfa: 50_000_000,
          createdAt: new Date(),
          parcelle: { nup: "BJ-1", commune: "Parakou", superficieM2: 300 },
          publieePar: { nomComplet: "Vendeur Test" },
        },
      ],
      conventionsParCommune: { Parakou: [{ montantFcfa: 10_000_000, parcelle: { superficieM2: 200 } }] },
    });
    const resultats = await service.annoncesARisque();
    expect(resultats).toHaveLength(0);
  });
});

describe("AdminService.suspendreAnnonce — moderation de contenu (E1.14)", () => {
  it("refuse de suspendre une annonce introuvable", async () => {
    const { service } = creerService();
    await expect(service.suspendreAnnonce("inconnue", { motif: "Prix aberrant constate" }, ADMIN)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuse de suspendre une annonce deja retiree", async () => {
    const { service } = creerService({ annonce: { id: "annonce-1", parcelleId: "parcelle-1", statut: "RETIREE" } });
    await expect(service.suspendreAnnonce("annonce-1", { motif: "Prix aberrant constate" }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("suspend une annonce active et journalise l'audit", async () => {
    const { service, obtenirAnnonce, auditAppels } = creerService({
      annonce: { id: "annonce-1", parcelleId: "parcelle-1", statut: "ACTIVE" },
    });
    await service.suspendreAnnonce("annonce-1", { motif: "Prix trois fois superieur a la moyenne communale" }, ADMIN);
    expect((obtenirAnnonce() as any).statut).toBe("RETIREE");
    expect(auditAppels).toHaveLength(1);
    expect((auditAppels[0] as any).typeOperation).toBe("SUSPENSION_ADMIN_ANNONCE");
  });
});
