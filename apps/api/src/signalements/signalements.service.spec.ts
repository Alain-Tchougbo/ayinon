import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StatutAnnonce, StatutSignalement, TypeSignalement } from "@ayinon/shared";
import { SignalementsService } from "./signalements.service";

const CITOYEN = { id: "citoyen-1", role: "CITOYEN", nomComplet: "Citoyen Test" } as any;
const ADMIN = { id: "admin-1", role: "ADMIN", nomComplet: "Admin Test" } as any;

function creerService(
  options: {
    parcelle?: Record<string, unknown> | null;
    annonce?: Record<string, unknown> | null;
    signalement?: Record<string, unknown> | null;
  } = {},
) {
  const parcelle = options.parcelle === null ? null : { id: "parcelle-1", ...options.parcelle };
  const annonce = options.annonce === null ? null : { id: "annonce-1", parcelleId: "parcelle-1", statut: StatutAnnonce.ACTIVE, ...options.annonce };
  let signalement: Record<string, unknown> | null = options.signalement ?? null;
  let annonceMiseAJour: Record<string, unknown> | null = null;
  const auditAppels: unknown[] = [];

  const prisma = {
    parcelle: { findUnique: async () => parcelle },
    annonce: {
      findUnique: async () => annonce,
      updateMany: async ({ data }: any) => {
        annonceMiseAJour = { ...annonce, ...data };
        return { count: 1 };
      },
    },
    signalement: {
      create: async ({ data }: any) => {
        signalement = { id: "signalement-1", statut: StatutSignalement.DEPOSE, ...data };
        return signalement;
      },
      findUnique: async () => signalement,
      findMany: async () => (signalement ? [signalement] : []),
      update: async ({ data }: any) => {
        signalement = { ...(signalement as Record<string, unknown>), ...data };
        return signalement;
      },
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new SignalementsService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirAnnonceMiseAJour: () => annonceMiseAJour };
}

describe("SignalementsService — signalements d'annonce et litiges fonciers", () => {
  it("refuse un signalement sans annonceId ni parcelleId", async () => {
    const { service } = creerService({ annonce: null, parcelle: null });
    await expect(
      service.deposer({ type: TypeSignalement.LITIGE_FONCIER, motif: "Occupation illegale constatee" } as any, CITOYEN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse un signalement sur une annonce introuvable", async () => {
    const { service } = creerService({ annonce: null });
    await expect(
      service.deposer({ type: TypeSignalement.ANNONCE, annonceId: "annonce-inconnue", motif: "Parcelle deja occupee" }, CITOYEN),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("depose un signalement sur une annonce et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const signalement = await service.deposer(
      { type: TypeSignalement.ANNONCE, annonceId: "annonce-1", motif: "Parcelle deja occupee par un tiers" },
      CITOYEN,
    );
    expect(signalement.statut).toBe(StatutSignalement.DEPOSE);
    expect((signalement as any).parcelleId).toBe("parcelle-1");
    expect(auditAppels).toHaveLength(1);
  });

  it("retire l'annonce liee quand le signalement est qualifie fonde", async () => {
    const { service, obtenirAnnonceMiseAJour } = creerService({
      signalement: { id: "signalement-1", type: TypeSignalement.ANNONCE, annonceId: "annonce-1", parcelleId: "parcelle-1", statut: StatutSignalement.DEPOSE },
    });
    await service.qualifier("signalement-1", { fonde: true, motif: "Occupation confirmee sur place" }, ADMIN);
    expect((obtenirAnnonceMiseAJour() as any).statut).toBe(StatutAnnonce.RETIREE);
  });

  it("ne touche pas l'annonce quand le signalement est rejete", async () => {
    const { service, obtenirAnnonceMiseAJour } = creerService({
      signalement: { id: "signalement-1", type: TypeSignalement.ANNONCE, annonceId: "annonce-1", parcelleId: "parcelle-1", statut: StatutSignalement.DEPOSE },
    });
    await service.qualifier("signalement-1", { fonde: false, motif: "Aucune preuve fournie par le signalant" }, ADMIN);
    expect(obtenirAnnonceMiseAJour()).toBeNull();
  });

  it("ne gele jamais une parcelle directement pour un litige foncier fonde (reserve au magistrat CSAF)", async () => {
    const { service, obtenirAnnonceMiseAJour } = creerService({
      signalement: { id: "signalement-1", type: TypeSignalement.LITIGE_FONCIER, annonceId: null, parcelleId: "parcelle-1", statut: StatutSignalement.DEPOSE },
    });
    const resultat = await service.qualifier("signalement-1", { fonde: true, motif: "Succession contestee par la famille" }, ADMIN);
    expect(resultat.statut).toBe(StatutSignalement.FONDE);
    expect(obtenirAnnonceMiseAJour()).toBeNull();
  });

  it("refuse de qualifier deux fois le meme signalement", async () => {
    const { service } = creerService({
      signalement: { id: "signalement-1", type: TypeSignalement.ANNONCE, annonceId: "annonce-1", parcelleId: "parcelle-1", statut: StatutSignalement.FONDE },
    });
    await expect(service.qualifier("signalement-1", { fonde: true, motif: "Deja traite" }, ADMIN)).rejects.toBeInstanceOf(BadRequestException);
  });
});
