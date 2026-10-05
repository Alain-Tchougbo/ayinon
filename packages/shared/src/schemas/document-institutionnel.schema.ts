import { z } from "zod";
import { TypeDocumentInstitutionnel } from "../enums";

/**
 * Scellement generique d'un document officiel (le fichier binaire est envoye en multipart a part),
 * reutilisant exactement le mecanisme deja construit pour les conventions de vente (hash SHA-256 +
 * signature Ed25519 + QR code), ouvert ici a toute autorite habilitee (ANDF, CSAF, notaire, admin)
 * pour un document qui n'est pas une convention de vente.
 */
export const SceellerDocumentInstitutionnelSchema = z.object({
  titre: z.string().trim().min(3),
  type: z.nativeEnum(TypeDocumentInstitutionnel),
  description: z.string().trim().min(3).optional(),
});
export type SceellerDocumentInstitutionnelDto = z.infer<typeof SceellerDocumentInstitutionnelSchema>;

/** Payload encode dans le QR code appose sur le document institutionnel. */
export const QrDocumentInstitutionnelPayloadSchema = z.object({
  documentId: z.string().uuid(),
  hashSha256: z.string().length(64),
  horodatage: z.string().datetime(),
});
export type QrDocumentInstitutionnelPayload = z.infer<typeof QrDocumentInstitutionnelPayloadSchema>;

/** Verification d'authenticite (Scanner Anti-Fraude, meme principe que pour une convention). */
export const VerifierDocumentInstitutionnelSchema = z.object({
  payload: QrDocumentInstitutionnelPayloadSchema,
  signatureEd25519: z.string().min(1),
});
export type VerifierDocumentInstitutionnelDto = z.infer<typeof VerifierDocumentInstitutionnelSchema>;
