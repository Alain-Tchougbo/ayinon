const BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statut: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

function lireCookie(nom: string): string | null {
  const correspondance = document.cookie.match(new RegExp(`(?:^|; )${nom}=([^;]*)`));
  return correspondance ? decodeURIComponent(correspondance[1]!) : null;
}

const METHODES_MUTANTES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

interface OptionsRequete {
  method?: string;
  body?: unknown;
  formData?: FormData;
  entetesSupplementaires?: Record<string, string>;
}

async function requete<T>(chemin: string, options: OptionsRequete = {}, dejaRetente = false): Promise<T> {
  const method = options.method ?? "GET";
  const entetes: Record<string, string> = { ...options.entetesSupplementaires };
  if (METHODES_MUTANTES.has(method)) {
    const csrf = lireCookie("ayinon_csrf_token");
    if (csrf) entetes["X-CSRF-Token"] = csrf;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    entetes["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    method,
    headers: entetes,
    body,
    credentials: "include",
  });

  if (reponse.status === 401 && !dejaRetente && chemin !== "/auth/rafraichir") {
    const rafraichi = await fetch(`${BASE_URL}/auth/rafraichir`, { method: "POST", credentials: "include" });
    if (rafraichi.ok) {
      return requete<T>(chemin, options, true);
    }
  }

  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : undefined;

  if (!reponse.ok) {
    throw new ApiError(donnees?.message ?? "Erreur reseau", reponse.status, donnees);
  }
  return donnees as T;
}

export const api = {
  get: <T>(chemin: string) => requete<T>(chemin),
  post: <T>(chemin: string, body?: unknown, entetesSupplementaires?: Record<string, string>) =>
    requete<T>(chemin, { method: "POST", body, entetesSupplementaires }),
  patch: <T>(chemin: string, body?: unknown) => requete<T>(chemin, { method: "PATCH", body }),
  delete: <T>(chemin: string) => requete<T>(chemin, { method: "DELETE" }),
  postForm: <T>(chemin: string, formData: FormData) => requete<T>(chemin, { method: "POST", formData }),
};
