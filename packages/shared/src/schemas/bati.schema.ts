import { z } from "zod";
import { GeoJsonPolygonSchema } from "./geo.schema";

/** Saisie manuelle d'un bati par un geometre/agent (source SAISIE_MANUELLE, voir enums.ts). */
export const CreationBatiSchema = z.object({
  geometrie: GeoJsonPolygonSchema,
  parcelleId: z.string().uuid().optional(),
});
export type CreationBatiDto = z.infer<typeof CreationBatiSchema>;

/** Validation/correction d'un bati importe par detection IA (geometrie et rattachement modifiables). */
export const ValidationBatiSchema = z.object({
  geometrie: GeoJsonPolygonSchema.optional(),
  parcelleId: z.string().uuid().nullable().optional(),
});
export type ValidationBatiDto = z.infer<typeof ValidationBatiSchema>;
