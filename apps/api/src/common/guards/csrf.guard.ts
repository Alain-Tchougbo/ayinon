import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { COOKIE_CSRF } from "../cookies.util";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { SKIP_CSRF_KEY } from "../decorators/skip-csrf.decorator";

const METHODES_SURES = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Protection CSRF par double-soumission de cookie : le frontend doit renvoyer, dans l'en-tete
 * X-CSRF-Token, la meme valeur que le cookie ayinon_csrf_token pose a la connexion. Un site tiers
 * ne peut pas lire ce cookie (SameSite=Strict) ni forcer l'en-tete personnalise.
 *
 * Exempte les routes @Public() : n'exploitant jamais le cookie de session pour determiner
 * l'auteur de l'action, elles ne sont pas exposees a une falsification via un site tiers
 * (ex. recherche cadastrale, verification de convention, depot d'opposition par un voisin non inscrit).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (METHODES_SURES.has(request.method)) {
      return true;
    }

    const exempte = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (exempte) {
      return true;
    }

    const cookieCsrf = request.cookies?.[COOKIE_CSRF];
    const enTeteCsrf = request.headers["x-csrf-token"];

    if (!cookieCsrf || !enTeteCsrf || cookieCsrf !== enTeteCsrf) {
      throw new ForbiddenException("Jeton CSRF manquant ou invalide");
    }
    return true;
  }
}
