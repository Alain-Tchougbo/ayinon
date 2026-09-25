import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AdminService } from "./admin.service";

const ADMIN = { id: "admin-1", role: "ADMIN", nomComplet: "Admin Test" } as any;

function creerService(options: { utilisateur?: Record<string, unknown> | null } = {}) {
  let utilisateur: Record<string, unknown> | null =
    options.utilisateur === null ? null : { id: "compte-1", statutValidationPro: "EN_ATTENTE", role: "GEOMETRE", ...options.utilisateur };
  const auditAppels: unknown[] = [];

  const prisma = {
    utilisateur: {
      findUnique: async () => utilisateur,
      update: async ({ data }: any) => {
        utilisateur = { ...(utilisateur as Record<string, unknown>), ...data };
        return utilisateur;
      },
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new AdminService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirUtilisateur: () => utilisateur };
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
