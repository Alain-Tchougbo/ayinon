import { z } from "zod";

/** E3.2 : recherche sauvegardee, memes filtres combinables que la vitrine (GET /annonces),
 * figes au moment de l'enregistrement. Body JSON (pas de querystring) : les booleens arrivent
 * donc deja types, contrairement a RechercheAnnonceSchema. */
export const SauvegarderRechercheSchema = z.object({
  nom: z.string().trim().min(2).max(80),
  commune: z.string().trim().min(1).optional(),
  prixMinFcfa: z.coerce.number().nonnegative().optional(),
  prixMaxFcfa: z.coerce.number().positive().optional(),
  superficieMinM2: z.coerce.number().nonnegative().optional(),
  superficieMaxM2: z.coerce.number().positive().optional(),
  verifieeAndf: z.boolean().optional(),
  limitesCertifiees: z.boolean().optional(),
});
export type SauvegarderRechercheDto = z.infer<typeof SauvegarderRechercheSchema>;
