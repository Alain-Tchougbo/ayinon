import { TypeOperationAudit } from "@ayinon/shared";
import { CryptoAuditService } from "./crypto-audit.service";
import { Ed25519KeysService } from "./ed25519-keys.service";

/** Faux PrismaService en memoire : suffit pour tester le chainage sans base reelle. */
class PrismaEnMemoireFake {
  private lignes: any[] = [];

  mutationAudit = {
    // this.lignes est deja dans l'ordre d'insertion : c'est ce que "sequence" garantit en base
    // (contrairement a horodatage, qui peut coincider entre deux ecritures rapprochees).
    findFirst: async () => this.lignes[this.lignes.length - 1] ?? null,
    findMany: async () => [...this.lignes],
    create: async ({ data }: { data: any }) => {
      const ligne = { id: `audit-${this.lignes.length + 1}`, sequence: this.lignes.length + 1, ...data };
      this.lignes.push(ligne);
      return ligne;
    },
  };

  // Utilitaire de test : simule une alteration retroactive d'une entree.
  alterer(index: number, mutation: (ligne: any) => void) {
    const ligne = this.lignes[index];
    mutation(ligne);
  }
}

describe("CryptoAuditService — chaine d'audit cryptographique", () => {
  let prisma: PrismaEnMemoireFake;
  let cles: Ed25519KeysService;
  let service: CryptoAuditService;

  beforeEach(() => {
    prisma = new PrismaEnMemoireFake();
    cles = new Ed25519KeysService();
    cles.onModuleInit();
    service = new CryptoAuditService(prisma as any, cles);
  });

  it("chaine chaque nouvelle entree au hash de bloc precedent", async () => {
    const premiere = await service.enregistrer({
      typeOperation: TypeOperationAudit.CREATION_PARCELLE,
      payload: { nup: "BJ-0001" },
    });
    const seconde = await service.enregistrer({
      typeOperation: TypeOperationAudit.VERROUILLAGE_ANTI_VENTE,
      payload: { nup: "BJ-0001" },
    });

    expect(premiere.hashBlocPrecedent).toBe("0".repeat(64));
    expect(seconde.hashBlocPrecedent).toBe(premiere.hashBloc);
  });

  it("declare le registre valide quand rien n'a ete altere", async () => {
    await service.enregistrer({ typeOperation: TypeOperationAudit.CREATION_PARCELLE, payload: { nup: "BJ-0001" } });
    await service.enregistrer({ typeOperation: TypeOperationAudit.GEL_CSAF, payload: { motif: "litige" } });
    await service.enregistrer({ typeOperation: TypeOperationAudit.LEVEE_GEL_CSAF, payload: { motif: "resolu" } });

    const resultat = await service.verifierIntegriteRegistre();
    expect(resultat.valide).toBe(true);
  });

  it("detecte une alteration retroactive du payload d'une entree", async () => {
    await service.enregistrer({ typeOperation: TypeOperationAudit.CREATION_PARCELLE, payload: { nup: "BJ-0001" } });
    const cible = await service.enregistrer({
      typeOperation: TypeOperationAudit.GEL_CSAF,
      payload: { motif: "litige foncier" },
    });
    await service.enregistrer({ typeOperation: TypeOperationAudit.LEVEE_GEL_CSAF, payload: { motif: "resolu" } });

    // Un attaquant modifie discretement le payload stocke sans recalculer le hash de bloc.
    prisma.alterer(1, (ligne) => {
      ligne.payload = { motif: "aucun litige" };
      ligne.hashPayload = service.hashPayload(ligne.payload);
    });

    const resultat = await service.verifierIntegriteRegistre();
    expect(resultat.valide).toBe(false);
    if (!resultat.valide) {
      expect(resultat.premiereAlterationId).toBe(cible.id);
    }
  });

  it("detecte une signature Ed25519 falsifiee meme si le hash de bloc est recalcule correctement", async () => {
    await service.enregistrer({ typeOperation: TypeOperationAudit.CREATION_PARCELLE, payload: { nup: "BJ-0001" } });

    prisma.alterer(0, (ligne) => {
      ligne.signatureEd25519 = "00".repeat(64);
    });

    const resultat = await service.verifierIntegriteRegistre();
    expect(resultat.valide).toBe(false);
  });
});
