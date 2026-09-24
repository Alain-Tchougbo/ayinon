import { z } from "zod";
import { DeposerOppositionSchema } from "./famille.schema";

/** Action mise en file localement (IndexedDB) pendant une periode hors-ligne, puis rejouee au retour reseau. */
export const ActionEnAttenteSchema = z.object({
  idLocal: z.string().min(1),
  type: z.literal("DEPOSER_OPPOSITION"),
  dto: DeposerOppositionSchema,
});
export type ActionEnAttenteDto = z.infer<typeof ActionEnAttenteSchema>;

export const PousserActionsSchema = z.object({
  actions: z.array(ActionEnAttenteSchema).max(100),
});
export type PousserActionsDto = z.infer<typeof PousserActionsSchema>;
