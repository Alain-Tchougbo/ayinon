import { SetMetadata } from "@nestjs/common";

export const SKIP_CSRF_KEY = "skipCsrf";

/** A utiliser uniquement sur les routes qui initient la session (connexion, rafraichissement du token). */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
