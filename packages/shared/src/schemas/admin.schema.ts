import { z } from "zod";

/** E0.6 : un motif est toujours exige, qu'il s'agisse d'approuver ou de rejeter (tracabilite —
 * meme convention que la qualification d'un signalement). */
export const TraiterDemandeProSchema = z.object({
  approuver: z.boolean(),
  motifRejet: z.string().trim().min(10).max(500).optional(),
});
export type TraiterDemandeProDto = z.infer<typeof TraiterDemandeProSchema>;

/** E1.14 : suspension de moderation d'une annonce (prix aberrant detecte automatiquement ou
 * tout autre motif constate par l'admin), motif toujours exige et journalise. */
export const SuspendreAnnonceSchema = z.object({
  motif: z.string().trim().min(10).max(500),
});
export type SuspendreAnnonceDto = z.infer<typeof SuspendreAnnonceSchema>;

/** Suspension/reactivation d'un compte utilisateur depuis le back-office : motif obligatoire
 * uniquement pour suspendre (une reactivation n'a pas besoin d'etre justifiee de la meme facon). */
export const SuspendreUtilisateurSchema = z.object({
  suspendre: z.boolean(),
  motif: z.string().trim().min(10).max(500).optional(),
});
export type SuspendreUtilisateurDto = z.infer<typeof SuspendreUtilisateurSchema>;

/** Correction de coordonnees de contact d'un proprietaire depuis le back-office (ex. faute de
 * frappe signalee) : jamais la propriete des parcelles elle-meme, qui reste pilotee par les
 * workflows de cession dedies. */
export const ModifierProprietaireSchema = z.object({
  email: z.string().trim().email().optional().nullable(),
  telephone: z.string().trim().min(6).max(20).optional().nullable(),
});
export type ModifierProprietaireDto = z.infer<typeof ModifierProprietaireSchema>;
