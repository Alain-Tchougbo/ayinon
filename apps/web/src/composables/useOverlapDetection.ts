import type { GeoJsonPolygon } from "@ayinon/shared";
import { featureCollection, intersect, polygon } from "@turf/turf";

export interface ParcelleVoisine {
  id: string;
  nup: string;
  geometrie: GeoJsonPolygon;
}

export interface ConflitLocal {
  id: string;
  nup: string;
}

/**
 * Pre-verification instantanee cote client (Turf.js) avant meme l'envoi au serveur : donne un
 * retour immediat au geometre pendant la saisie. La validation faisant foi reste toujours
 * PostGIS cote serveur (ST_Intersects / ST_Area) - voir GeometreService.importerBornage.
 */
export function detecterChevauchementLocal(nouvelle: GeoJsonPolygon, voisines: ParcelleVoisine[]): ConflitLocal[] {
  const conflits: ConflitLocal[] = [];
  let polygoneNouveau;
  try {
    polygoneNouveau = polygon(nouvelle.coordinates);
  } catch {
    return conflits;
  }

  for (const voisine of voisines) {
    try {
      const polygoneVoisin = polygon(voisine.geometrie.coordinates);
      const intersection = intersect(featureCollection([polygoneNouveau, polygoneVoisin]));
      if (intersection) {
        conflits.push({ id: voisine.id, nup: voisine.nup });
      }
    } catch {
      // Geometrie voisine invalide : ignoree cote client, le serveur reste seul juge.
    }
  }
  return conflits;
}
