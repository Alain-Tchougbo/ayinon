const SECRET_JWT_DEV = "dev-access-secret-a-ne-jamais-utiliser-en-prod";

/**
 * Refuse de demarrer en production si JWT_ACCESS_SECRET n'a pas ete configure : un repli
 * silencieux signerait tous les jetons avec une valeur connue et publique dans le depot Git,
 * permettant a quiconque de forger un access token valide.
 */
export function obtenirSecretJwt(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET doit etre defini en production (voir .env.example).");
  }
  return SECRET_JWT_DEV;
}
