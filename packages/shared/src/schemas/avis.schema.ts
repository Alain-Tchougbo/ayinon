import { z } from "zod";

/** E7.7 : note reciproque en fin de transaction (Convention VALIDEE uniquement). */
export const DeposerAvisSchema = z.object({
  conventionId: z.string().uuid(),
  note: z.coerce.number().int().min(1).max(5),
  commentaire: z.string().trim().min(3).max(500).optional(),
});
export type DeposerAvisDto = z.infer<typeof DeposerAvisSchema>;
