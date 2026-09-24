import type { CookieOptions } from "express";

export const COOKIE_ACCES = "ayinon_access_token";
export const COOKIE_RAFRAICHISSEMENT = "ayinon_refresh_token";
export const COOKIE_CSRF = "ayinon_csrf_token";

const estProduction = process.env.NODE_ENV === "production";

export const optionsCookieAuth = (maxAgeMs: number, path = "/api"): CookieOptions => ({
  httpOnly: true,
  sameSite: "strict",
  secure: estProduction,
  path,
  maxAge: maxAgeMs,
});

/** Le cookie CSRF n'est volontairement pas httpOnly : le frontend doit pouvoir le lire pour le renvoyer en en-tete. */
export const optionsCookieCsrf = (maxAgeMs: number): CookieOptions => ({
  httpOnly: false,
  sameSite: "strict",
  secure: estProduction,
  path: "/",
  maxAge: maxAgeMs,
});
