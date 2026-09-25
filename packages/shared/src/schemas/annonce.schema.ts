import { z } from "zod";

/** Publication d'une annonce (E1.1) : le vendeur choisit une parcelle qu'il possede. */
export const CreerAnnonceSchema = z.object({
  parcelleId: z.string().uuid(),
  prixIndicatifFcfa: z.coerce.number().positive().optional(),
  description: z.string().trim().min(10).max(2000).optional(),
});
export type CreerAnnonceDto = z.infer<typeof CreerAnnonceSchema>;

/** Manifestation d'interet d'un acheteur (E3.1/E3.5, version simplifiee sans prise de rendez-vous). */
export const ManifesterInteretSchema = z.object({
  message: z.string().trim().min(5).max(1000).optional(),
});
export type ManifesterInteretDto = z.infer<typeof ManifesterInteretSchema>;

/** Le vendeur retient un interet parmi ceux recus (E4.3) : demarre la cession classique. */
export const RetenirInteretSchema = z.object({
  montantFcfa: z.coerce.number().positive(),
});
export type RetenirInteretDto = z.infer<typeof RetenirInteretSchema>;

/** Verification ANDF d'une annonce (E1.11/E2.2) : pose le badge "situation fonciere controlee". */
export const VerifierAnnonceSchema = z.object({
  conforme: z.boolean(),
  motif: z.string().trim().min(10).optional(),
});
export type VerifierAnnonceDto = z.infer<typeof VerifierAnnonceSchema>;

/** Filtres de la vitrine (E3.1) : tous optionnels, combinables. Les booleens arrivent en
 * querystring sous forme de chaine ("true"/absent) plutot que z.coerce.boolean(), qui coercerait
 * a tort la chaine "false" en true (comportement natif de Boolean("false")). */
export const RechercheAnnonceSchema = z.object({
  commune: z.string().trim().min(1).optional(),
  prixMinFcfa: z.coerce.number().nonnegative().optional(),
  prixMaxFcfa: z.coerce.number().positive().optional(),
  superficieMinM2: z.coerce.number().nonnegative().optional(),
  superficieMaxM2: z.coerce.number().positive().optional(),
  verifieeAndf: z.string().optional(),
  limitesCertifiees: z.string().optional(),
});
export type RechercheAnnonceDto = z.infer<typeof RechercheAnnonceSchema>;

/** Exclusivite temporaire (E4.5) : le vendeur suspend l'arrivee de nouveaux interets au profit
 * d'un acheteur deja interesse, pour une duree bornee (1 a 30 jours). */
export const AccorderExclusiviteSchema = z.object({
  acheteurId: z.string().uuid(),
  dureeJours: z.coerce.number().int().min(1).max(30),
});
export type AccorderExclusiviteDto = z.infer<typeof AccorderExclusiviteSchema>;
