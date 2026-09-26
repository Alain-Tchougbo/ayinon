import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { StatutCession } from "@ayinon/shared";
import { AvisService } from "./avis.service";

const VENDEUR = { id: "vendeur-1", role: "VENDEUR", nomComplet: "Vendeur Test" } as any;
const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", nomComplet: "Acheteur Test" } as any;
const TIERS = { id: "tiers-1", role: "CITOYEN", nomComplet: "Tiers Test" } as any;

function creerService(
  options: { convention?: Record<string, unknown> | null; avisExistant?: Record<string, unknown> | null } = {},
) {
  const convention =
    options.convention === null
      ? null
      : { id: "convention-1", parcelleId: "parcelle-1", statutCession: StatutCession.VALIDEE, creeParId: VENDEUR.id, acquereurId: ACHETEUR.id, ...options.convention };
  const auditAppels: unknown[] = [];

  const prisma = {
    convention: { findUnique: async () => convention, count: async () => 3 },
    avis: {
      findUnique: async () => options.avisExistant ?? null,
      create: async ({ data }: any) => ({ id: "avis-1", createdAt: new Date(), ...data }),
      findMany: async () => [],
    },
    utilisateur: { findUnique: async () => ({ id: "vendeur-1", nomComplet: "Vendeur Test", role: "VENDEUR", createdAt: new Date() }) },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new AvisService(prisma as any, cryptoAudit as any);
  return { service, auditAppels };
}

describe("AvisService — notation reciproque en fin de transaction", () => {
  it("refuse de noter une cession non validee", async () => {
    const { service } = creerService({ convention: { statutCession: StatutCession.ACCEPTEE } });
    await expect(service.deposer({ conventionId: "convention-1", note: 5 }, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse qu'un tiers etranger a la cession depose un avis", async () => {
    const { service } = creerService();
    await expect(service.deposer({ conventionId: "convention-1", note: 5 }, TIERS)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("permet a l'acquereur de noter le vendeur et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const avis = await service.deposer({ conventionId: "convention-1", note: 5, commentaire: "Tres bonne transaction" }, ACHETEUR);
    expect((avis as any).citeId).toBe(VENDEUR.id);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse de noter deux fois la meme cession", async () => {
    const { service } = creerService({ avisExistant: { id: "avis-existant" } });
    await expect(service.deposer({ conventionId: "convention-1", note: 4 }, ACHETEUR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("calcule une note moyenne honnete sur le profil public", async () => {
    const { service } = creerService();
    const profil = await service.profil("vendeur-1");
    expect(profil.ventesConclues).toBe(3);
    expect(profil.nombreAvis).toBe(0);
    expect(profil.noteMoyenne).toBeNull();
  });
});
