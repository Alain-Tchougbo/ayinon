import { z } from "zod";

/** E4.6 : demande d'accord de financement, avec piece jointe optionnelle (le fichier lui-meme
 * transite hors du body JSON, via multipart — voir DemandeFinancementController). */
export const DemanderFinancementSchema = z.object({
  montantSouhaiteFcfa: z.coerce.number().positive(),
  annonceId: z.string().uuid().optional(),
});
export type DemanderFinancementDto = z.infer<typeof DemanderFinancementSchema>;

/** E4.8 : la banque tranche elle-meme, jamais un score automatique. Motif exige uniquement en cas
 * de refus ; montant accorde exige uniquement en cas d'accord de principe. */
export const TraiterFinancementSchema = z
  .object({
    decision: z.enum(["ACCORD_PRINCIPE", "REFUSER"]),
    montantAccordeFcfa: z.coerce.number().positive().optional(),
    motifRefus: z.string().trim().min(10).max(500).optional(),
  })
  .refine((donnees) => donnees.decision !== "ACCORD_PRINCIPE" || donnees.montantAccordeFcfa !== undefined, {
    message: "Le montant accorde est requis pour un accord de principe",
    path: ["montantAccordeFcfa"],
  })
  .refine((donnees) => donnees.decision !== "REFUSER" || Boolean(donnees.motifRefus), {
    message: "Un motif est requis pour refuser une demande de financement",
    path: ["motifRefus"],
  });
export type TraiterFinancementDto = z.infer<typeof TraiterFinancementSchema>;
