# Import d'occupation du sol (zones agricoles)

Ce dossier reçoit les polygones d'occupation du sol déjà **vectorisés**, à préparer en dehors de
ce dépôt avant de lancer l'import.

## Source recommandée

[ESA WorldCover](https://esa-worldcover.org/en/data-access) — classification satellite mondiale à
10m de résolution (classe "Cropland" entre autres), licence CC-BY-4.0, couverture du Bénin incluse.
Distribué en GeoTIFF (raster) : à vectoriser au préalable (ex. export Google Earth Engine ou
traitement QGIS "raster to vector") avant de déposer le résultat ici. Ce n'est **pas** le zonage
officiel du Bénin — purement indicatif, toujours présenté comme tel dans l'application.

## Format attendu

Un ou plusieurs fichiers `.geojson`, chacun une `FeatureCollection` de polygones :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [[[1.7167, 6.6389], ...]] },
      "properties": { "typeUsage": "AGRICOLE" }
    }
  ]
}
```

`typeUsage` est optionnel parmi `AGRICOLE|URBAIN|FORET|EAU|AUTRE` — à défaut, `AGRICOLE` est
supposé (cas d'usage principal : la classe "Cropland" d'ESA WorldCover).

## Lancer l'import

```bash
pnpm --filter api run import:zonage
```

Le script calcule ensuite, pour chaque parcelle recoupant au moins une zone importée, l'usage du
sol dominant (plus grande surface d'intersection) et l'écrit dans `Parcelle.usageSolIndicatif` —
jamais dans `usageSolValide`, réservé à la confirmation d'un agent ANDF (voir
`apps/web/src/views/andf/ValidationUsageSolView.vue`, ou `GET /parcelles/a-valider-usage-sol`).
