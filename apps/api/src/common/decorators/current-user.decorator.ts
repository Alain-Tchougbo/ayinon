import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RoleUtilisateur } from "@ayinon/shared";

export interface UtilisateurAuthentifie {
  id: string;
  email: string;
  role: RoleUtilisateur;
  nomComplet: string;
  proprietaireId: string | null;
}

/** Injecte l'utilisateur authentifie (attache par JwtStrategy) dans un handler de route. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UtilisateurAuthentifie => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as UtilisateurAuthentifie;
});
