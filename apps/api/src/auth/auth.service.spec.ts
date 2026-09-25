import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { hacherMotDePasse } from "./password.util";

function creerService(options: { utilisateurExistant?: Record<string, unknown> | null } = {}) {
  let utilisateur: Record<string, unknown> | null = options.utilisateurExistant ?? null;
  const auditAppels: unknown[] = [];

  const prisma = {
    utilisateur: {
      findUnique: async () => utilisateur,
      create: async ({ data }: any) => {
        utilisateur = { id: "utilisateur-1", ...data };
        return utilisateur;
      },
      update: async ({ data }: any) => {
        utilisateur = { ...(utilisateur as Record<string, unknown>), ...data };
        return utilisateur;
      },
    },
    refreshToken: { create: async ({ data }: any) => ({ id: "rt-1", ...data }) },
  };

  const jwtService = new JwtService({});
  const otp = {
    genererCode: async () => "123456",
    verifierCode: async () => true,
  };
  const cryptoAudit = {
    enregistrer: async (entree: unknown) => {
      auditAppels.push(entree);
      return entree;
    },
  };

  const service = new AuthService(prisma as any, jwtService, otp as any, cryptoAudit as any);
  return { service, obtenirUtilisateur: () => utilisateur, auditAppels };
}

describe("AuthService — inscription et validation des comptes professionnels (E0.5/E0.6)", () => {
  it("inscrit un citoyen sans exiger de validation professionnelle", async () => {
    const { service, obtenirUtilisateur, auditAppels } = creerService();
    await service.inscrire({ email: "citoyen@test.bj", motDePasse: "MotDePasse123!", nomComplet: "Citoyen Test", role: "CITOYEN" } as any);
    expect((obtenirUtilisateur() as any).statutValidationPro).toBe("NON_APPLICABLE");
    expect(auditAppels).toHaveLength(0);
  });

  it("inscrit un geometre en attente de validation et journalise l'audit", async () => {
    const { service, obtenirUtilisateur, auditAppels } = creerService();
    await service.inscrire({
      email: "geo@test.bj",
      motDePasse: "MotDePasse123!",
      nomComplet: "Geometre Test",
      role: "GEOMETRE",
      numeroAgrement: "OGEB-512",
    } as any);
    expect((obtenirUtilisateur() as any).statutValidationPro).toBe("EN_ATTENTE");
    expect(auditAppels).toHaveLength(1);
  });

  it("refuse la connexion d'un compte professionnel en attente de validation", async () => {
    const motDePasseHash = await hacherMotDePasse("MotDePasse123!");
    const { service } = creerService({
      utilisateurExistant: {
        id: "u1",
        email: "geo@test.bj",
        motDePasseHash,
        emailValide: true,
        statutValidationPro: "EN_ATTENTE",
        role: "GEOMETRE",
        proprietaireId: null,
      },
    });
    await expect(service.connexion("geo@test.bj", "MotDePasse123!")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("refuse la connexion d'un compte professionnel rejete, en citant le motif", async () => {
    const motDePasseHash = await hacherMotDePasse("MotDePasse123!");
    const { service } = creerService({
      utilisateurExistant: {
        id: "u1",
        email: "geo@test.bj",
        motDePasseHash,
        emailValide: true,
        statutValidationPro: "REJETE",
        motifRejetPro: "Numero d'agrement introuvable au registre OGEB",
        role: "GEOMETRE",
        proprietaireId: null,
      },
    });
    await expect(service.connexion("geo@test.bj", "MotDePasse123!")).rejects.toThrow(/Numero d'agrement introuvable/);
  });

  it("permet la connexion d'un compte professionnel approuve", async () => {
    const motDePasseHash = await hacherMotDePasse("MotDePasse123!");
    const { service } = creerService({
      utilisateurExistant: {
        id: "u1",
        email: "geo@test.bj",
        motDePasseHash,
        emailValide: true,
        statutValidationPro: "APPROUVE",
        role: "GEOMETRE",
        proprietaireId: null,
      },
    });
    const resultat = await service.connexion("geo@test.bj", "MotDePasse123!");
    expect(resultat.jetons.accessToken).toBeTruthy();
  });

  it("confirme l'e-mail sans ouvrir de session pour un professionnel en attente", async () => {
    const { service, obtenirUtilisateur } = creerService({
      utilisateurExistant: {
        id: "u1",
        email: "geo@test.bj",
        emailValide: false,
        statutValidationPro: "EN_ATTENTE",
        role: "GEOMETRE",
        proprietaireId: null,
      },
    });
    const resultat = await service.confirmerInscription("geo@test.bj", "123456");
    expect(resultat.jetons).toBeNull();
    expect((obtenirUtilisateur() as any).emailValide).toBe(true);
  });

  it("ouvre une session des la confirmation pour un compte non professionnel", async () => {
    const { service } = creerService({
      utilisateurExistant: {
        id: "u1",
        email: "citoyen@test.bj",
        emailValide: false,
        statutValidationPro: "NON_APPLICABLE",
        role: "CITOYEN",
        proprietaireId: null,
      },
    });
    const resultat = await service.confirmerInscription("citoyen@test.bj", "123456");
    expect(resultat.jetons?.accessToken).toBeTruthy();
  });
});
