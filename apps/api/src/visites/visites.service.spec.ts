import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { StatutAnnonce, StatutVisite } from "@ayinon/shared";
import { VisitesService } from "./visites.service";

const VENDEUR = { id: "vendeur-1", role: "VENDEUR", nomComplet: "Vendeur Test" } as any;
const ACHETEUR = { id: "acheteur-1", role: "ACHETEUR", nomComplet: "Acheteur Test" } as any;
const AUTRE_ACHETEUR = { id: "acheteur-2", role: "ACHETEUR", nomComplet: "Autre Acheteur" } as any;

function creerService(
  options: { annonce?: Record<string, unknown> | null; visite?: Record<string, unknown> | null } = {},
) {
  const annonce =
    options.annonce === null ? null : { id: "annonce-1", parcelleId: "parcelle-1", publieeParId: VENDEUR.id, statut: StatutAnnonce.ACTIVE, ...options.annonce };
  let visite: Record<string, unknown> | null = options.visite ?? null;
  const auditAppels: unknown[] = [];

  const prisma = {
    annonce: { findUnique: async () => annonce },
    visite: {
      create: async ({ data }: any) => {
        visite = { id: "visite-1", statut: StatutVisite.DEMANDEE, ...data };
        return visite;
      },
      findUnique: async () => (visite ? { ...(visite as Record<string, unknown>), annonce } : null),
      update: async ({ data }: any) => {
        visite = { ...(visite as Record<string, unknown>), ...data };
        return visite;
      },
    },
  };

  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new VisitesService(prisma as any, cryptoAudit as any);
  return { service, auditAppels, obtenirVisite: () => visite };
}

describe("VisitesService — demandes de visite (E3.5/E3.6)", () => {
  it("refuse une demande de visite sur sa propre annonce", async () => {
    const { service } = creerService();
    await expect(
      service.demander("annonce-1", { dateProposee: new Date(), mode: "PRESENTIEL" } as any, VENDEUR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse une demande de visite sur une annonce retiree", async () => {
    const { service } = creerService({ annonce: { statut: StatutAnnonce.RETIREE } });
    await expect(
      service.demander("annonce-1", { dateProposee: new Date(), mode: "PRESENTIEL" } as any, ACHETEUR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("cree une demande de visite et journalise l'audit", async () => {
    const { service, auditAppels } = creerService();
    const visite = await service.demander("annonce-1", { dateProposee: new Date("2026-10-01T10:00:00Z"), mode: "PRESENTIEL" } as any, ACHETEUR);
    expect((visite as any).statut).toBe(StatutVisite.DEMANDEE);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse qu'un acheteur reponde a une demande DEMANDEE (seul le vendeur le peut)", async () => {
    const { service } = creerService({ visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.DEMANDEE } });
    await expect(service.repondre("visite-1", { decision: "CONFIRMER" }, ACHETEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("le vendeur confirme une demande de visite", async () => {
    const { service, obtenirVisite } = creerService({ visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.DEMANDEE } });
    await service.repondre("visite-1", { decision: "CONFIRMER" }, VENDEUR);
    expect((obtenirVisite() as any).statut).toBe(StatutVisite.CONFIRMEE);
  });

  it("le vendeur reprogramme une demande de visite", async () => {
    const nouvelleDate = new Date("2026-10-05T14:00:00Z");
    const { service, obtenirVisite } = creerService({ visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.DEMANDEE } });
    await service.repondre("visite-1", { decision: "REPROGRAMMER", nouvelleDate }, VENDEUR);
    expect((obtenirVisite() as any).statut).toBe(StatutVisite.REPROGRAMMEE);
    expect((obtenirVisite() as any).nouvelleDateProposee).toBe(nouvelleDate);
  });

  it("refuse que l'acheteur reprogramme a son tour (seul le vendeur le peut)", async () => {
    const { service } = creerService({
      visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.REPROGRAMMEE, nouvelleDateProposee: new Date() },
    });
    await expect(service.repondre("visite-1", { decision: "REPROGRAMMER", nouvelleDate: new Date() }, ACHETEUR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuse qu'un vendeur agisse sur une visite deja reprogrammee (c'est au tour de l'acheteur)", async () => {
    const { service } = creerService({
      visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.REPROGRAMMEE, nouvelleDateProposee: new Date() },
    });
    await expect(service.repondre("visite-1", { decision: "CONFIRMER" }, VENDEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse qu'un tiers acheteur reponde a une visite reprogrammee qui n'est pas la sienne", async () => {
    const { service } = creerService({
      visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.REPROGRAMMEE, nouvelleDateProposee: new Date() },
    });
    await expect(service.repondre("visite-1", { decision: "CONFIRMER" }, AUTRE_ACHETEUR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("l'acheteur confirme la nouvelle date proposee", async () => {
    const nouvelleDate = new Date("2026-10-05T14:00:00Z");
    const { service, obtenirVisite } = creerService({
      visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.REPROGRAMMEE, nouvelleDateProposee: nouvelleDate },
    });
    await service.repondre("visite-1", { decision: "CONFIRMER" }, ACHETEUR);
    expect((obtenirVisite() as any).statut).toBe(StatutVisite.CONFIRMEE);
    expect((obtenirVisite() as any).dateProposee).toBe(nouvelleDate);
  });

  it("refuse de repondre a une visite deja traitee", async () => {
    const { service } = creerService({ visite: { annonceId: "annonce-1", acheteurId: ACHETEUR.id, statut: StatutVisite.CONFIRMEE } });
    await expect(service.repondre("visite-1", { decision: "CONFIRMER" }, VENDEUR)).rejects.toBeInstanceOf(BadRequestException);
  });
});
