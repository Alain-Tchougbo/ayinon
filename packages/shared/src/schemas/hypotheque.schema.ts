import { z } from "zod";

/** Recherche de solvabilite par une banque : la parcelle est-elle titree, non gelee et libre de gage ? */
export const VerifierSolvabiliteSchema = z.object({
  nup: z.string().trim().min(3),
});
export type VerifierSolvabiliteDto = z.infer<typeof VerifierSolvabiliteSchema>;

/** Inscription d'une hypotheque : la banque marque son gage sur une parcelle qu'elle a verifiee libre. */
export const InscrireHypothequeSchema = z.object({
  parcelleId: z.string().uuid(),
  banqueNom: z.string().trim().min(2),
  montantGarantiFcfa: z.coerce.number().positive(),
});
export type InscrireHypothequeDto = z.infer<typeof InscrireHypothequeSchema>;

export const LeverHypothequeSchema = z.object({
  motifLevee: z.string().trim().min(10),
});
export type LeverHypothequeDto = z.infer<typeof LeverHypothequeSchema>;
