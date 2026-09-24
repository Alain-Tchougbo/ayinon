import { SetMetadata } from "@nestjs/common";
import type { RoleUtilisateur } from "@ayinon/shared";

export const ROLES_KEY = "roles";

/** Restreint une route a une liste de roles RBAC. A combiner avec JwtAuthGuard + RolesGuard. */
export const Roles = (...roles: RoleUtilisateur[]) => SetMetadata(ROLES_KEY, roles);
