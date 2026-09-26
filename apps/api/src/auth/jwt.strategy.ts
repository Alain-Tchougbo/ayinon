import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { RoleUtilisateur } from "@ayinon/shared";
import { COOKIE_ACCES } from "../common/cookies.util";
import { obtenirSecretJwt } from "../common/env.util";
import { PrismaService } from "../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  role: RoleUtilisateur;
  proprietaireId: string | null;
}

const extraireDepuisCookie = (request: Request): string | null => {
  return (request?.cookies?.[COOKIE_ACCES] as string | undefined) ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extraireDepuisCookie]),
      ignoreExpiration: false,
      secretOrKey: obtenirSecretJwt(),
    });
  }

  async validate(payload: JwtPayload) {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { id: payload.sub } });
    if (!utilisateur) {
      throw new UnauthorizedException("Utilisateur introuvable");
    }
    if (utilisateur.compteSuspenduLe) {
      throw new UnauthorizedException("Compte suspendu");
    }
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      nomComplet: utilisateur.nomComplet,
      proprietaireId: utilisateur.proprietaireId,
    };
  }
}
