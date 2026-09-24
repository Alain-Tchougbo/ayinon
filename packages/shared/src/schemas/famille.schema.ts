import { z } from "zod";
import { RoleFamilial } from "../enums";

const RoleFamilialSchema = z.nativeEnum(RoleFamilial);

/**
 * Ouverture d'un protocole de multi-signature familiale pour une mutation de terre hereditaire.
 * Quorum minimal impose : l'Aine + le Representant des femmes + au moins un Cadet.
 */
export const OuvrirMultiSignatureSchema = z.object({
  parcelleId: z.string().uuid(),
  mandataires: z
    .array(
      z.object({
        proprietaireId: z.string().uuid(),
        role: RoleFamilialSchema,
      }),
    )
    .min(3)
    .refine((mandataires) => mandataires.some((m) => m.role === RoleFamilial.AINE), {
      message: "Un Aine doit figurer parmi les mandataires",
    })
    .refine((mandataires) => mandataires.some((m) => m.role === RoleFamilial.REPRESENTANT_FEMMES), {
      message: "Un Representant des femmes doit figurer parmi les mandataires",
    })
    .refine((mandataires) => mandataires.some((m) => m.role === RoleFamilial.CADET), {
      message: "Au moins un Cadet doit figurer parmi les mandataires",
    }),
});
export type OuvrirMultiSignatureDto = z.infer<typeof OuvrirMultiSignatureSchema>;

export const SignerMandatSchema = z.object({
  signatureFamilleId: z.string().uuid(),
  accepte: z.boolean(),
  codeOtp: z.string().length(6),
});
export type SignerMandatDto = z.infer<typeof SignerMandatSchema>;

export const DeposerOppositionSchema = z.object({
  banId: z.string().uuid(),
  opposantNom: z.string().trim().min(2),
  opposantContact: z.string().trim().min(6),
  motif: z.string().trim().min(10),
});
export type DeposerOppositionDto = z.infer<typeof DeposerOppositionSchema>;
