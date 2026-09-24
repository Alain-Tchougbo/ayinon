import { z } from "zod";

/** Gel conservatoire judiciaire : reserve aux magistrats CSAF (verifie cote serveur via RBAC). */
export const GelConservatoireSchema = z.object({
  parcelleId: z.string().uuid(),
  motif: z.string().trim().min(10),
  referenceDossierJudiciaire: z.string().trim().min(3),
});
export type GelConservatoireDto = z.infer<typeof GelConservatoireSchema>;

export const LeveeGelSchema = z.object({
  conflitId: z.string().uuid(),
  motifLevee: z.string().trim().min(10),
});
export type LeveeGelDto = z.infer<typeof LeveeGelSchema>;
