import { z } from "zod";

/** Position GeoJSON [longitude, latitude], bornee aux coordonnees plausibles pour le Benin. */
export const PositionSchema = z
  .tuple([z.number().min(-4).max(4), z.number().min(5).max(13)])
  .describe("[longitude, latitude]");

/** Anneau lineaire GeoJSON : au moins 4 positions, premiere == derniere (polygone ferme). */
export const AnneauLineaireSchema = z
  .array(PositionSchema)
  .min(4)
  .refine(
    (anneau) => {
      const premier = anneau[0];
      const dernier = anneau[anneau.length - 1];
      return premier?.[0] === dernier?.[0] && premier?.[1] === dernier?.[1];
    },
    { message: "L'anneau lineaire doit etre ferme (premier point == dernier point)" },
  );

export const GeoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(AnneauLineaireSchema).min(1),
});
export type GeoJsonPolygon = z.infer<typeof GeoJsonPolygonSchema>;
