import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { StatutCession, StatutParcelle } from "@ayinon/shared";
import { CessionsService } from "./cessions.service";

const VENDEUR = { id: "vendeur-1", email: "vendeur@ayinon.bj", role: "CITOYEN", proprietaireId: "prop-vendeur", nomComplet: "Vendeur Test" } as any;
const ACQUEREUR_UTILISATEUR = {
  id: "acquereur-1",
  email: "acquereur@ayinon.bj",
  role: "CITOYEN",
  proprietaireId: null,
  nomComplet: "Acquereur Test",
  telephone: null,
};
const AGENT_ANDF = { id: "andf-1", email: "andf@ayinon.bj", role: "AGENT_ANDF", proprietaireId: null, nomComplet: "Agent ANDF" } as any;

function parcelleParDefaut(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "parcelle-1",
    proprietaireId: "prop-vendeur",
    verrouAntiVente: false,
    statut: StatutParcelle.EN_COURS,
    ...overrides,
  };
}

/** Construit un service avec un etat Prisma en memoire minimal, dans le meme esprit que geometre.service.spec.ts. */
function creerService(options: { parcelle?: Record<string, unknown> | null; convention?: Record<string, unknown> | null; parcelleGelee?: boolean } = {}) {
  const parcelle = options.parcelle === null ? null : parcelleParDefaut(options.parcelle);
  let convention: Record<string, unknown> | null = options.convention ?? null;
  let titreCree: Record<string, unknown> | null = null;
  const auditAppels: unknown[] = [];

  const prisma = {
    parcelle: {
      findUnique: async () => parcelle,
      update: async ({ data }: any) => ({ ...parcelle, ...data }),
    },
    utilisateur: {
      findUnique: async ({ where }: any) => (where.email === ACQUEREUR_UTILISATEUR.email ? ACQUEREUR_UTILISATEUR : null),
      findUniqueOrThrow: async () => ACQUEREUR_UTILISATEUR,
      update: async ({ data }: any) => ({ ...ACQUEREUR_UTILISATEUR, ...data }),
    },
    proprietaire: {
      create: async ({ data }: any) => ({ id: "prop-acquereur-nouveau", ...data }),
    },
    titre: {
      count: async () => 0,
      create: async ({ data }: any) => {
        titreCree = { id: "titre-1", ...data };
        return titreCree;
      },
    },
    convention: {
      create: async ({ data }: any) => {
        convention = { id: "convention-1", ...data };
        return convention;
      },
      findUnique: async () => convention,
      // Reproduit le comportement Prisma reel : un include: { titre: true } sur l'update reflete
      // le Titre cree juste avant dans la meme transaction (relation inverse Convention -> Titre).
      update: async ({ data }: any) => {
        convention = { ...(convention as Record<string, unknown>), ...data, titre: titreCree };
        return convention;
      },
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };

  const cryptoAudit = {
    signerDonnees: () => "signature-test",
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const csaf = {
    verifierParcelleNonGelee: async (parcelleId: string) => {
      if (options.parcelleGelee) {
        throw new ForbiddenException("Parcelle sous gel conservatoire judiciaire (CSAF) : operation bloquee");
      }
    },
  };

  const service = new CessionsService(prisma as any, cryptoAudit as any, csaf as any);
  return { service, auditAppels, obtenirConvention: () => convention };
}

describe("CessionsService — parcours d'achat/vente citoyen-a-citoyen", () => {
  it("refuse une proposition si le vendeur n'est pas le proprietaire enregistre", async () => {
    const { service } = creerService({ parcelle: { proprietaireId: "quelqu-un-dautre" } });

    await expect(
      service.proposer({ parcelleId: "parcelle-1", acquereurEmail: ACQUEREUR_UTILISATEUR.email, montantFcfa: 1_000_000 }, VENDEUR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse une proposition sur une parcelle verrouillee contre la vente", async () => {
    const { service } = creerService({ parcelle: { verrouAntiVente: true } });

    await expect(
      service.proposer({ parcelleId: "parcelle-1", acquereurEmail: ACQUEREUR_UTILISATEUR.email, montantFcfa: 1_000_000 }, VENDEUR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse une proposition sur une parcelle geloe conservatoirement (CSAF)", async () => {
    const { service } = creerService({ parcelleGelee: true });

    await expect(
      service.proposer({ parcelleId: "parcelle-1", acquereurEmail: ACQUEREUR_UTILISATEUR.email, montantFcfa: 1_000_000 }, VENDEUR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse une proposition vers un email sans compte citoyen", async () => {
    const { service } = creerService();

    await expect(
      service.proposer({ parcelleId: "parcelle-1", acquereurEmail: "inconnu@ayinon.bj", montantFcfa: 1_000_000 }, VENDEUR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cree une convention PROPOSEE et journalise l'audit quand tout est valide", async () => {
    const { service, auditAppels } = creerService();

    const convention = await service.proposer(
      { parcelleId: "parcelle-1", acquereurEmail: ACQUEREUR_UTILISATEUR.email, montantFcfa: 1_000_000 },
      VENDEUR,
    );

    expect(convention.statutCession).toBe(StatutCession.PROPOSEE);
    expect(convention.acquereurId).toBe(ACQUEREUR_UTILISATEUR.id);
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse qu'une autre personne que l'acquereur designe reponde a la proposition", async () => {
    const { service } = creerService({ convention: { id: "convention-1", acquereurId: "quelqu-un-dautre", statutCession: StatutCession.PROPOSEE } });

    await expect(service.repondre("convention-1", { accepter: true }, { id: ACQUEREUR_UTILISATEUR.id, role: "CITOYEN" } as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("refuse de repondre deux fois a la meme proposition", async () => {
    const { service } = creerService({
      convention: { id: "convention-1", acquereurId: ACQUEREUR_UTILISATEUR.id, statutCession: StatutCession.ACCEPTEE },
    });

    await expect(
      service.repondre("convention-1", { accepter: true }, { id: ACQUEREUR_UTILISATEUR.id, role: "CITOYEN" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("exige un motif pour refuser une proposition", async () => {
    const { service } = creerService({
      convention: { id: "convention-1", acquereurId: ACQUEREUR_UTILISATEUR.id, statutCession: StatutCession.PROPOSEE },
    });

    await expect(
      service.repondre("convention-1", { accepter: false }, { id: ACQUEREUR_UTILISATEUR.id, role: "CITOYEN" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuse de valider une cession qui n'a pas encore ete acceptee par l'acquereur", async () => {
    const { service } = creerService({ convention: { id: "convention-1", parcelleId: "parcelle-1", statutCession: StatutCession.PROPOSEE } });

    await expect(service.valider("convention-1", { approuver: true }, AGENT_ANDF)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("valide une cession acceptee : delivre un titre et transfere la propriete de la parcelle", async () => {
    const { service, obtenirConvention } = creerService({
      convention: { id: "convention-1", parcelleId: "parcelle-1", acquereurId: ACQUEREUR_UTILISATEUR.id, statutCession: StatutCession.ACCEPTEE },
    });

    const resultat = await service.valider("convention-1", { approuver: true }, AGENT_ANDF);

    expect(resultat.statutCession).toBe(StatutCession.VALIDEE);
    expect(resultat.titre).toBeTruthy();
    expect((resultat.titre as any).numeroTitre).toMatch(/^BJ-TITRE-\d{4}-\d{6}$/);
    expect((obtenirConvention() as any).statutCession).toBe(StatutCession.VALIDEE);
  });
});
