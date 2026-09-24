import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import { parseDureeMs } from "../common/duree.util";
import { PrismaService } from "../prisma/prisma.service";
import { hacherMotDePasse, verifierMotDePasse } from "./password.util";
import type { JwtPayload } from "./jwt.strategy";

export interface PaireJetons {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async connexion(email: string, motDePasse: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur || !(await verifierMotDePasse(motDePasse, utilisateur.motDePasseHash))) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    const jetons = await this.emettreJetons(utilisateur.id, utilisateur.role, utilisateur.proprietaireId);
    return { utilisateur, jetons };
  }

  async rafraichir(refreshTokenBrut: string) {
    const tokenHash = this.hacherRefreshToken(refreshTokenBrut);
    const enregistrement = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { utilisateur: true },
    });
    if (!enregistrement) {
      throw new UnauthorizedException("Session expiree, veuillez vous reconnecter");
    }

    await this.prisma.refreshToken.update({
      where: { id: enregistrement.id },
      data: { revokedAt: new Date() },
    });

    const jetons = await this.emettreJetons(
      enregistrement.utilisateur.id,
      enregistrement.utilisateur.role,
      enregistrement.utilisateur.proprietaireId,
    );
    return { utilisateur: enregistrement.utilisateur, jetons };
  }

  async deconnexion(refreshTokenBrut: string | undefined) {
    if (!refreshTokenBrut) return;
    const tokenHash = this.hacherRefreshToken(refreshTokenBrut);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async creerCompte(donnees: {
    email: string;
    motDePasse: string;
    role: JwtPayload["role"];
    nomComplet: string;
    proprietaireId?: string;
  }) {
    const motDePasseHash = await hacherMotDePasse(donnees.motDePasse);
    return this.prisma.utilisateur.create({
      data: {
        email: donnees.email,
        motDePasseHash,
        role: donnees.role,
        nomComplet: donnees.nomComplet,
        proprietaireId: donnees.proprietaireId,
      },
    });
  }

  private async emettreJetons(utilisateurId: string, role: JwtPayload["role"], proprietaireId: string | null): Promise<PaireJetons> {
    const accessTokenTtl = process.env.JWT_ACCESS_TTL ?? "15m";
    const refreshTokenTtl = process.env.JWT_REFRESH_TTL ?? "7d";

    const payload: JwtPayload = { sub: utilisateurId, role, proprietaireId };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-a-ne-jamais-utiliser-en-prod",
      expiresIn: accessTokenTtl,
    });

    const refreshTokenBrut = randomBytes(48).toString("hex");
    const refreshTokenTtlMs = parseDureeMs(refreshTokenTtl);
    await this.prisma.refreshToken.create({
      data: {
        utilisateurId,
        tokenHash: this.hacherRefreshToken(refreshTokenBrut),
        expiresAt: new Date(Date.now() + refreshTokenTtlMs),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenBrut,
      accessTokenTtlMs: parseDureeMs(accessTokenTtl),
      refreshTokenTtlMs,
    };
  }

  private hacherRefreshToken(refreshTokenBrut: string): string {
    return createHash("sha256").update(refreshTokenBrut).digest("hex");
  }
}
