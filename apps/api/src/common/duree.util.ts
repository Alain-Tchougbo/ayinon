const UNITES_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Convertit une duree courte ("15m", "7d", "30s") en millisecondes. */
export function parseDureeMs(valeur: string): number {
  const correspondance = /^(\d+)([smhd])$/.exec(valeur.trim());
  if (!correspondance) {
    throw new Error(`Format de duree invalide : "${valeur}" (attendu ex. "15m", "7d")`);
  }
  const [, nombre, unite] = correspondance as unknown as [string, string, string];
  return Number(nombre) * UNITES_MS[unite]!;
}
