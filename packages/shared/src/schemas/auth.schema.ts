import { z } from "zod";
import { RoleUtilisateur, StatutDeclarantVendeur } from "../enums";

export const ConnexionSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8),
});
export type ConnexionDto = z.infer<typeof ConnexionSchema>;

/** Inscription en libre-service (E0.1) : reservee aux roles grand public, jamais aux comptes
 * institutionnels ou professionnels (E0.5-E0.7), qui restent crees exclusivement par un admin
 * apres verification. */
export const ROLES_INSCRIPTIBLES = [RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR] as const;

export const InscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  motDePasse: z.string().min(8),
  nomComplet: z.string().trim().min(2),
  telephone: z.string().trim().min(6).optional(),
  role: z.enum(["CITOYEN", "VENDEUR", "ACHETEUR"]),
  /// Requis uniquement pour un VENDEUR (E0.3) ; adapte les pieces attendues lors de la publication.
  statutDeclarant: z.nativeEnum(StatutDeclarantVendeur).optional(),
});
export type InscriptionDto = z.infer<typeof InscriptionSchema>;

export const ConfirmerInscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().length(6),
});
export type ConfirmerInscriptionDto = z.infer<typeof ConfirmerInscriptionSchema>;
