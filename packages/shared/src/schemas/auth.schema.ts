import { z } from "zod";
import { RoleUtilisateur, StatutDeclarantVendeur } from "../enums";

export const ConnexionSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8),
});
export type ConnexionDto = z.infer<typeof ConnexionSchema>;

/** Inscription en libre-service (E0.1) : roles grand public, actifs des la confirmation du code
 * envoye. Jamais les comptes institutionnels (ANDF/CSAF/ADMIN, E0.7), qui restent crees
 * exclusivement par un admin sur demande officielle de leur institution. */
export const ROLES_INSCRIPTIBLES = [RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR] as const;

/** Professionnels admis a l'inscription en libre-service (E0.5), mais dont le compte reste
 * bloque a la connexion (StatutValidationPro.EN_ATTENTE) tant qu'un admin ne l'a pas approuve
 * (E0.6), meme apres confirmation du code envoye a l'inscription. */
export const ROLES_PROFESSIONNELS_INSCRIPTIBLES = [RoleUtilisateur.GEOMETRE, RoleUtilisateur.NOTAIRE, RoleUtilisateur.AGENT_BANQUE] as const;

export const InscriptionSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    motDePasse: z.string().min(8),
    nomComplet: z.string().trim().min(2),
    telephone: z.string().trim().min(6).optional(),
    role: z.enum(["CITOYEN", "VENDEUR", "ACHETEUR", "GEOMETRE", "NOTAIRE", "AGENT_BANQUE"]),
    /// Requis uniquement pour un VENDEUR (E0.3) ; adapte les pieces attendues lors de la publication.
    statutDeclarant: z.nativeEnum(StatutDeclarantVendeur).optional(),
    /// Requis uniquement pour un role professionnel (E0.5) : numero d'agrement ou d'ordre.
    numeroAgrement: z.string().trim().min(3).max(100).optional(),
  })
  .refine((donnees) => !ROLES_PROFESSIONNELS_INSCRIPTIBLES.includes(donnees.role as (typeof ROLES_PROFESSIONNELS_INSCRIPTIBLES)[number]) || Boolean(donnees.numeroAgrement), {
    message: "Le numero d'agrement ou d'ordre professionnel est requis pour ce role",
    path: ["numeroAgrement"],
  });
export type InscriptionDto = z.infer<typeof InscriptionSchema>;

export const ConfirmerInscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().length(6),
});
export type ConfirmerInscriptionDto = z.infer<typeof ConfirmerInscriptionSchema>;
