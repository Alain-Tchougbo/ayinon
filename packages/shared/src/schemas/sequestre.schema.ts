import { z } from "zod";

/** E5.4 : declaration d'un depot de reservation (suivi de statut, aucun mouvement d'argent reel). */
export const DeclarerSequestreSchema = z.object({
  conventionId: z.string().uuid(),
  montantFcfa: z.coerce.number().positive(),
});
export type DeclarerSequestreDto = z.infer<typeof DeclarerSequestreSchema>;
