import { z } from "zod";
import { TypeDecisionCsaf } from "../enums";

/** Gel conservatoire judiciaire : reserve aux magistrats CSAF (verifie cote serveur via RBAC). */
export const GelConservatoireSchema = z.object({
  parcelleId: z.string().uuid(),
  motif: z.string().trim().min(10),
  referenceDossierJudiciaire: z.string().trim().min(3),
});
export type GelConservatoireDto = z.infer<typeof GelConservatoireSchema>;

/** E8.8 : la levee porte desormais la decision definitive du magistrat. LEVEE_SIMPLE restaure
 * simplement le statut anterieur ; ANNULATION_VENTE/TRANSFERT_FORCE annulent en plus toute
 * cession/annonce en cours, TRANSFERT_FORCE exigeant le nom du proprietaire designe. */
export const LeveeGelSchema = z
  .object({
    conflitId: z.string().uuid(),
    motifLevee: z.string().trim().min(10),
    typeDecision: z.nativeEnum(TypeDecisionCsaf).default(TypeDecisionCsaf.LEVEE_SIMPLE),
    nouveauProprietaireNom: z.string().trim().min(2).optional(),
  })
  .refine((donnees) => donnees.typeDecision !== TypeDecisionCsaf.TRANSFERT_FORCE || Boolean(donnees.nouveauProprietaireNom), {
    message: "Le nom du nouveau proprietaire designe par la decision est requis pour un transfert force",
    path: ["nouveauProprietaireNom"],
  });
export type LeveeGelDto = z.infer<typeof LeveeGelSchema>;
