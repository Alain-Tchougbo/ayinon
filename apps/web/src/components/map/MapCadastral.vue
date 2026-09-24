<script setup lang="ts">
import { COULEUR_STATUT_PARCELLE } from "@ayinon/shared";
import { bbox } from "@turf/turf";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ParcelleCache } from "../../db/localDb";

const props = defineProps<{ parcelles: ParcelleCache[] }>();
const emit = defineEmits<{ selection: [ParcelleCache] }>();

const SOURCE_ID = "parcelles";

/** Fond OSM raster (aucune cle requise) — a remplacer par des tuiles vectorielles officielles en production. */
const STYLE_FOND: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; contributeurs OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

let carte: maplibregl.Map | undefined;
let popup: maplibregl.Popup | undefined;
const conteneur = ref<HTMLDivElement>();

function construireGeoJson(parcelles: ParcelleCache[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: parcelles.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: p.geometrie,
      properties: {
        id: p.id,
        nup: p.nup,
        statut: p.statut,
        commune: p.commune,
        superficieM2: p.superficieM2,
        proprietaireNom: p.proprietaireNom,
        verrouAntiVente: p.verrouAntiVente,
      },
    })),
  };
}

function rafraichirDonnees() {
  if (!carte) return;
  const source = carte.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  const donnees = construireGeoJson(props.parcelles);
  source?.setData(donnees);

  if (props.parcelles.length > 0) {
    const [minX, minY, maxX, maxY] = bbox(donnees);
    carte.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 48, maxZoom: 15, duration: 400 },
    );
  }
}

onMounted(() => {
  if (!conteneur.value) return;

  carte = new maplibregl.Map({
    container: conteneur.value,
    style: STYLE_FOND,
    center: [2.3158, 9.3077], // centre approximatif du Benin
    zoom: 6.2,
    attributionControl: { compact: true },
  });
  carte.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  if (import.meta.env.DEV) {
    // Expose l'instance en dev uniquement, pour l'inspection manuelle / les scripts de verification.
    (window as unknown as { __ayinonMap?: maplibregl.Map }).__ayinonMap = carte;
  }

  carte.on("load", () => {
    if (!carte) return;
    carte.addSource(SOURCE_ID, { type: "geojson", data: construireGeoJson(props.parcelles) });

    carte.addLayer({
      id: "parcelles-remplissage",
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": [
          "match",
          ["get", "statut"],
          "TITREE",
          COULEUR_STATUT_PARCELLE.TITREE,
          "EN_COURS",
          COULEUR_STATUT_PARCELLE.EN_COURS,
          "GEL_CSAF",
          COULEUR_STATUT_PARCELLE.GEL_CSAF,
          "DOMAINE_PUBLIC",
          COULEUR_STATUT_PARCELLE.DOMAINE_PUBLIC,
          /* couleur par defaut */ "#9ca3af",
        ],
        "fill-opacity": 0.55,
      },
    });
    carte.addLayer({
      id: "parcelles-contour",
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": "#12271a", "line-width": 1.5 },
    });

    carte.on("mouseenter", "parcelles-remplissage", () => {
      if (carte) carte.getCanvas().style.cursor = "pointer";
    });
    carte.on("mouseleave", "parcelles-remplissage", () => {
      if (carte) carte.getCanvas().style.cursor = "";
    });

    carte.on("click", "parcelles-remplissage", (evenement) => {
      const feature = evenement.features?.[0];
      if (!feature) return;
      const proprietes = feature.properties as Record<string, unknown>;
      const parcelle = props.parcelles.find((p) => p.id === proprietes.id);
      if (!parcelle) return;

      popup?.remove();
      popup = new maplibregl.Popup({ closeButton: true, maxWidth: "280px" })
        .setLngLat(evenement.lngLat)
        .setHTML(
          `<div style="font-family:sans-serif;font-size:13px;line-height:1.5">
            <strong>${parcelle.nup}</strong><br/>
            ${parcelle.commune}${parcelle.arrondissement ? " — " + parcelle.arrondissement : ""}<br/>
            Superficie : ${parcelle.superficieM2.toLocaleString("fr-FR")} m²<br/>
            Proprietaire : ${parcelle.proprietaireNom ?? "Non renseigne"}<br/>
            ${parcelle.verrouAntiVente ? "🔒 Verrou anti-vente actif" : ""}
          </div>`,
        )
        .addTo(carte!);

      emit("selection", parcelle);
    });

    rafraichirDonnees();
  });
});

onBeforeUnmount(() => {
  popup?.remove();
  carte?.remove();
});

watch(() => props.parcelles, rafraichirDonnees, { deep: false });
</script>

<template>
  <div class="relative h-full w-full overflow-hidden rounded-carte border border-bordure">
    <div ref="conteneur" class="h-full w-full" role="application" aria-label="Carte cadastrale interactive" />
  </div>
</template>
