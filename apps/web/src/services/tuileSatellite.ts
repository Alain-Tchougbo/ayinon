/**
 * Vraie tuile satellite (Esri World_Imagery, gratuite, sans cle — meme fournisseur que
 * MapCadastral.vue utilise pour le fond de plan) centree sur des coordonnees reelles. Utilisee
 * pour montrer une vraie image aerienne de l'emplacement exact d'une parcelle sur les cartes
 * d'annonces, plutot qu'une illustration ou, pire, une photo generique/trompeuse presentee comme
 * si elle etait celle d'un terrain precis.
 */
export interface TuileSatellite {
  url: string;
  positionXPourcent: number;
  positionYPourcent: number;
}

export function tuileSatellitePour(lng: number, lat: number, zoom = 17): TuileSatellite {
  const n = 2 ** zoom;
  const xFlottant = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFlottant = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x = Math.floor(xFlottant);
  const y = Math.floor(yFlottant);
  return {
    url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`,
    positionXPourcent: (xFlottant - x) * 100,
    positionYPourcent: (yFlottant - y) * 100,
  };
}
