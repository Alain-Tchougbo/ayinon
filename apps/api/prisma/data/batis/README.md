# Import de bâtis (identification des constructions)

Ce dossier reçoit les extraits GeoJSON de bâtiments détectés par imagerie satellite, à préparer
**en dehors de ce dépôt** avant de lancer l'import.

## Source recommandée

[Google Open Buildings](https://sites.research.google/open-buildings/) — empreintes de bâtiments
détectées par IA, avec score de confiance, licence CC-BY-4.0/ODbL, couverture du Bénin incluse.
Téléchargement d'un extrait régional via le portail ou l'outil CLI [`get_buildings`](https://github.com/opengeos/open-buildings).

## Format attendu

Un ou plusieurs fichiers `.geojson`, chacun une `FeatureCollection` de polygones :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Polygon", "coordinates": [[[2.3945, 6.3688], ...]] },
      "properties": { "confidence": 0.87 }
    }
  ]
}
```

La propriété `confidence` est optionnelle (score 0-1). Seuls les polygones simples (`Polygon`) sont
supportés — les `MultiPolygon` sont ignorés avec un avertissement.

## Lancer l'import

```bash
pnpm --filter api run import:batis
```

Chaque bâtiment est inséré avec `source: IMPORT_IA` et `valide: false` — il n'apparaît pas comme
fiable tant qu'un géomètre ou un agent ne l'a pas confirmé (voir
`apps/web/src/views/geometre/ValidationBatisView.vue`, ou `GET /batis/a-valider`). Le rattachement
à une parcelle cadastrée existante est calculé automatiquement par recoupement spatial (PostGIS
`ST_Intersects`) après l'import.
