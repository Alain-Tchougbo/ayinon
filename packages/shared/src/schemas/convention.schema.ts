import { z } from "zod";

/**
 * Enregistrement d'une convention de vente (le fichier binaire est envoye en multipart a part).
 * montantFcfa utilise z.coerce : en multipart/form-data, tous les champs arrivent en chaines.
 */
export const EnregistrerConventionSchema = z.object({
  parcelleId: z.string().uuid(),
  vendeurNom: z.string().trim().min(2),
  acquereurNom: z.string().trim().min(2),
  montantFcfa: z.coerce.number().positive(),
});
export type EnregistrerConventionDto = z.infer<typeof EnregistrerConventionSchema>;

/** Payload encode dans le QR code appose sur la convention papier. */
export const QrConventionPayloadSchema = z.object({
  conventionId: z.string().uuid(),
  hashSha256: z.string().length(64),
  horodatage: z.string().datetime(),
});
export type QrConventionPayload = z.infer<typeof QrConventionPayloadSchema>;

/** Verification d'authenticite via le scanner : le QR fournit le payload + sa signature Ed25519. */
export const VerifierConventionSchema = z.object({
  payload: QrConventionPayloadSchema,
  signatureEd25519: z.string().min(1),
});
export type VerifierConventionDto = z.infer<typeof VerifierConventionSchema>;

/** Le vendeur (proprietaire actuel) propose la cession de l'une de ses parcelles a un acquereur identifie par email. */
export const ProposerCessionSchema = z.object({
  parcelleId: z.string().uuid(),
  acquereurEmail: z.string().trim().toLowerCase().email(),
  montantFcfa: z.coerce.number().positive(),
});
export type ProposerCessionDto = z.infer<typeof ProposerCessionSchema>;

/** Reponse de l'acquereur a une proposition de cession. */
export const RepondreCessionSchema = z.object({
  accepter: z.boolean(),
  motifRefus: z.string().trim().min(10).optional(),
});
export type RepondreCessionDto = z.infer<typeof RepondreCessionSchema>;

/** Validation (ou rejet) par un agent ANDF : declenche la delivrance du titre et le transfert de propriete. */
export const ValiderCessionSchema = z.object({
  approuver: z.boolean(),
  motifRejet: z.string().trim().min(10).optional(),
});
export type ValiderCessionDto = z.infer<typeof ValiderCessionSchema>;
