import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { ConnexionSchema } from "@ayinon/shared";
import { COOKIE_ACCES, COOKIE_CSRF, COOKIE_RAFRAICHISSEMENT, optionsCookieAuth, optionsCookieCsrf } from "../common/cookies.util";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { SkipCsrf } from "../common/decorators/skip-csrf.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService, type PaireJetons } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post("connexion")
  async connexion(
    @Body(new ZodValidationPipe(ConnexionSchema)) dto: { email: string; motDePasse: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { utilisateur, jetons } = await this.authService.connexion(dto.email, dto.motDePasse);
    this.poserCookiesSession(res, jetons);
    return this.serialiserUtilisateur(utilisateur);
  }

  @Public()
  @SkipCsrf()
  @Post("rafraichir")
  async rafraichir(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshTokenBrut = req.cookies?.[COOKIE_RAFRAICHISSEMENT] as string | undefined;
    const { utilisateur, jetons } = await this.authService.rafraichir(refreshTokenBrut ?? "");
    this.poserCookiesSession(res, jetons);
    return this.serialiserUtilisateur(utilisateur);
  }

  @Post("deconnexion")
  async deconnexion(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshTokenBrut = req.cookies?.[COOKIE_RAFRAICHISSEMENT] as string | undefined;
    await this.authService.deconnexion(refreshTokenBrut);
    res.clearCookie(COOKIE_ACCES, { path: "/api" });
    res.clearCookie(COOKIE_RAFRAICHISSEMENT, { path: "/api/auth" });
    res.clearCookie(COOKIE_CSRF, { path: "/" });
    return { message: "Deconnexion reussie" };
  }

  @Get("moi")
  moi(@CurrentUser() utilisateur: UtilisateurAuthentifie) {
    return utilisateur;
  }

  private poserCookiesSession(res: Response, jetons: PaireJetons) {
    res.cookie(COOKIE_ACCES, jetons.accessToken, optionsCookieAuth(jetons.accessTokenTtlMs, "/api"));
    res.cookie(COOKIE_RAFRAICHISSEMENT, jetons.refreshToken, optionsCookieAuth(jetons.refreshTokenTtlMs, "/api/auth"));
    res.cookie(COOKIE_CSRF, randomBytes(24).toString("hex"), optionsCookieCsrf(jetons.refreshTokenTtlMs));
  }

  private serialiserUtilisateur(utilisateur: {
    id: string;
    email: string;
    role: string;
    nomComplet: string;
    proprietaireId: string | null;
  }) {
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      nomComplet: utilisateur.nomComplet,
      proprietaireId: utilisateur.proprietaireId,
    };
  }
}
