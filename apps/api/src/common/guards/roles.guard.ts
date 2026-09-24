import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleUtilisateur } from "@ayinon/shared";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { UtilisateurAuthentifie } from "../decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequis = this.reflector.getAllAndOverride<RoleUtilisateur[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesRequis || rolesRequis.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const utilisateur = request.user as UtilisateurAuthentifie | undefined;
    if (!utilisateur || !rolesRequis.includes(utilisateur.role)) {
      throw new ForbiddenException("Role insuffisant pour cette operation");
    }
    return true;
  }
}
