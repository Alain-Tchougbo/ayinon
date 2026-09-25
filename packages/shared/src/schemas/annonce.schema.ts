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
