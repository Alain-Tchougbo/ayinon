import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Variante non bloquante de JwtAuthGuard : a poser en local (@UseGuards) sur une route deja
 * marquee @Public() (le JwtAuthGuard global la laisse passer sans jamais invoquer Passport).
 * Tente quand meme de peupler request.user via JwtStrategy si un cookie de session valide est
 * present, mais ne rejette jamais la requete — token absent/expire/invalide => request.user
 * reste undefined (mode anonyme), plutot que la 401 que leverait AuthGuard('jwt') standard.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  override handleRequest<TUser = unknown>(_err: unknown, user: TUser | false): TUser | undefined {
    return user ? user : undefined;
  }
}
