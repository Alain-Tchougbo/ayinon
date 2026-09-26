import { z } from "zod";
import { TypeUsageSol } from "../enums";

/** Recherche cadastrale : au moins un critere parmi NUP / position GPS / nom du proprietaire. */
export const RechercheParcelleSchema = z
  .object({
    nup: z.string().trim().min(3).optional(),
    latitude: z.number().min(5).max(13).optional(),
    longitude: z.number().min(-4).max(4).optional(),
    nomProprietaire: z.string().trim().min(2).optional(),
  })
  .refine(
    (v) => Boolean(v.nup) || Boolean(v.nomProprietaire) || (v.latitude !== undefined && v.longitude !== undefined),
    { message: "Fournir le NUP, une position GPS complete, ou le nom du proprietaire" },
  );
export type RechercheParcelleDto = z.infer<typeof RechercheParcelleSchema>;

export const DemandeVerrouParcelleSchema = z.object({
  parcelleId: z.string().uuid(),
  verrouille: z.boolean(),
  codeOtp: z.string().length(6),
});
export type DemandeVerrouParcelleDto = z.infer<typeof DemandeVerrouParcelleSchema>;

/** Simulateur transparent des frais de mutation (bareme DGI/TFU + emoluments notaries, parametrable). */
export const SimulationFraisSchema = z.object({
  valeurDeclareeFcfa: z.number().positive(),
  superficieM2: z.number().positive(),
  enZoneUrbaine: z.boolean().default(true),
});
export type SimulationFraisDto = z.infer<typeof SimulationFraisSchema>;

/** Edition administrative basique d'une fiche parcelle (donnees declaratives, hors statut cadastral
 * qui reste pilote par les workflows metier dedies : cession, gel CSAF, import geometre). */
export const ModifierParcelleAdminSchema = z.object({
  commune: z.string().trim().min(2).optional(),
  arrondissement: z.string().trim().min(2).nullable().optional(),
});
export type ModifierParcelleAdminDto = z.infer<typeof ModifierParcelleAdminSchema>;

/** Confirmation/correction par un agent ANDF de l'usage du sol indicatif (donnee satellite). */
export const ValidationUsageSolSchema = z.object({
  usageSol: z.nativeEnum(TypeUsageSol),
});
export type ValidationUsageSolDto = z.infer<typeof ValidationUsageSolSchema>;
