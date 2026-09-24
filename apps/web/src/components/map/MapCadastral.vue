<script setup lang="ts">
import { COULEUR_STATUT_PARCELLE, type StatutParcelle } from "@ayinon/shared";
import { bbox } from "@turf/turf";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ParcelleCache } from "../../db/localDb";

const props = defineProps<{ parcelles: ParcelleCache[] }>();
const emit = defineEmits<{ selection: [ParcelleCache] }>();

const SOURCE_ID = "parcelles";

const LIBELLE_STATUT: Record<StatutParcelle, string> = {
  TITREE: "Titree et securisee",
  EN_COURS: "En cours de securisation",
  GEL_CSAF: "Gel conservatoire (CSAF)",
  DOMAINE_PUBLIC: "Domaine public",
};

/** Icone cadenas minimale (glyphe Lucide), inlinee car le popup MapLibre est du HTML brut, hors rendu Vue. */
const SVG_CADENAS =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" ' +
  'stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="3" y="11" width="18" ' +
  'height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

/**
 * Le popup MapLibre est du HTML brut ajoute au document (hors rendu Vue) : on reference les
 * variables CSS de tokens.css (var(--color-...)) plutot que des couleurs figees, pour que le
 * popup suive fidelement le theme actif (clair/sombre/plein-soleil) au lieu de rester fige en blanc.
 */
function construirePopupHtml(parcelle: ParcelleCache): string {
  const couleurStatut = COULEUR_STATUT_PARCELLE[parcelle.statut];
  return `
    <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;min-width:200px;background:var(--color-surface);color:var(--color-texte);margin:-10px;padding:10px;border-radius:0.5rem">
      <div style="font-weight:700;font-size:14px;margin-bottom:2px">${parcelle.nup}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="width:9px;height:9px;border-radius:999px;background:${couleurStatut};display:inline-block"></span>
        <span>${LIBELLE_STATUT[parcelle.statut]}</span>
      </div>
      <div style="color:var(--color-texte-attenue)">
        ${parcelle.commune}${parcelle.arrondissement ? " — " + parcelle.arrondissement : ""}<br/>
        Superficie : ${parcelle.superficieM2.toLocaleString("fr-FR")} m²<br/>
        Proprietaire : ${parcelle.proprietaireNom ?? "Non renseigne"}
      </div>
      ${
        parcelle.verrouAntiVente
          ? `<div style="margin-top:8px;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--color-succes);color:var(--color-succes);padding:2px 8px;border-radius:999px;font-weight:600;font-size:12px">${SVG_CADENAS} Verrou anti-vente actif</div>`
          : ""
      }
    </div>`;
}

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
let observateurTaille: ResizeObserver | undefined;
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

  // Le conteneur est dimensionne par un layout flex (main flex-1 min-h-0 -> ... -> h-full en
  // cascade) : sa taille finale n'est pas forcement connue au premier rendu synchrone, ce qui
  // laisserait MapLibre initialiser un canvas de hauteur 0. Un ResizeObserver garantit un
  // carte.resize() des que la taille reelle du conteneur est disponible, et a chaque changement
  // ulterieur (ouverture du menu mobile, redimensionnement de fenetre, ...).
  observateurTaille = new ResizeObserver(() => carte?.resize());
  observateurTaille.observe(conteneur.value);

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
        .setHTML(construirePopupHtml(parcelle))
        .addTo(carte!);

      emit("selection", parcelle);
    });

    rafraichirDonnees();
  });
});

onBeforeUnmount(() => {
  observateurTaille?.disconnect();
  popup?.remove();
  carte?.remove();
});

watch(() => props.parcelles, rafraichirDonnees, { deep: false });
</script>

<template>
  <div class="relative flex w-full flex-1 overflow-hidden rounded-carte border border-bordure">
    <div ref="conteneur" class="w-full flex-1" role="application" aria-label="Carte cadastrale interactive" />
  </div>
</template>
