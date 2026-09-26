import { z } from "zod";
import { TypeSignalement } from "../enums";

/** E2.6/E8.1 : depot d'un signalement, soit sur une annonce precise, soit directement sur une
 * parcelle (litige foncier). Au moins l'un des deux identifiants doit etre fourni. */
export const DeposerSignalementSchema = z
  .object({
    type: z.nativeEnum(TypeSignalement),
    annonceId: z.string().uuid().optional(),
    parcelleId: z.string().uuid().optional(),
    motif: z.string().trim().min(10).max(200),
    descriptif: z.string().trim().min(10).max(2000).optional(),
  })
  .refine((v) => Boolean(v.annonceId || v.parcelleId), { message: "annonceId ou parcelleId requis" });
export type DeposerSignalementDto = z.infer<typeof DeposerSignalementSchema>;

/** E2.7/E8.2 : un motif de decision est toujours exige, qu'il s'agisse de rejeter ou de retenir. */
export const QualifierSignalementSchema = z.object({
  fonde: z.boolean(),
  motif: z.string().trim().min(10).max(500),
});
export type QualifierSignalementDto = z.infer<typeof QualifierSignalementSchema>;
