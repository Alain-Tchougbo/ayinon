import { z } from "zod";
import { GeoJsonPolygonSchema } from "./geo.schema";

/** Import d'un plan de bornage par un geometre-expert assermente. */
export const ImportBornageSchema = z.object({
  parcelleId: z.string().uuid(),
  geometrie: GeoJsonPolygonSchema,
  referenceDossier: z.string().trim().min(3),
});
export type ImportBornageDto = z.infer<typeof ImportBornageSchema>;

export const SignaturePlanBornageSchema = z.object({
  planBornageId: z.string().uuid(),
  numeroOrdreOgeb: z.string().trim().min(3),
});
export type SignaturePlanBornageDto = z.infer<typeof SignaturePlanBornageSchema>;
