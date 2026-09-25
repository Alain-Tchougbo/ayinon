import { z } from "zod";

/** E0.6 : un motif est toujours exige, qu'il s'agisse d'approuver ou de rejeter (tracabilite —
 * meme convention que la qualification d'un signalement). */
export const TraiterDemandeProSchema = z.object({
  approuver: z.boolean(),
  motifRejet: z.string().trim().min(10).max(500).optional(),
});
export type TraiterDemandeProDto = z.infer<typeof TraiterDemandeProSchema>;
