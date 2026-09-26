import { z } from "zod";
import { ModeVisite } from "../enums";

/** E3.5 : l'acheteur propose un creneau sur une annonce active. */
export const DemanderVisiteSchema = z.object({
  dateProposee: z.coerce.date(),
  mode: z.nativeEnum(ModeVisite),
  message: z.string().trim().min(5).max(500).optional(),
});
export type DemanderVisiteDto = z.infer<typeof DemanderVisiteSchema>;

/** E3.6 : le vendeur confirme/refuse/reprogramme une demande DEMANDEE ; l'acheteur confirme/refuse
 * a son tour une reprogrammation (statut REPROGRAMMEE). Une nouvelle date est requise uniquement
 * pour reprogrammer. */
export const RepondreVisiteSchema = z
  .object({
    decision: z.enum(["CONFIRMER", "REFUSER", "REPROGRAMMER"]),
    motifRefus: z.string().trim().min(5).max(500).optional(),
    nouvelleDate: z.coerce.date().optional(),
  })
  .refine((donnees) => donnees.decision !== "REPROGRAMMER" || Boolean(donnees.nouvelleDate), {
    message: "Une nouvelle date est requise pour reprogrammer la visite",
    path: ["nouvelleDate"],
  });
export type RepondreVisiteDto = z.infer<typeof RepondreVisiteSchema>;
