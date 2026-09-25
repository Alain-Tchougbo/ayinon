<script setup lang="ts">
import { bbox, mask } from "@turf/turf";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Fond decoratif de la hero publique : meme fond OSM raster que MapCadastral.vue (aucune cle
 * requise), pour une coherence visuelle entre cet apercu et le vrai outil cartographique en
 * /carte. Aucune donnee de parcelle ici — uniquement le contour national, pour situer le propos
 * avant que le visiteur ne recherche une parcelle precise.
 */
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

const conteneur = ref<HTMLDivElement>();
const moletteActive = ref(false);
let carte: maplibregl.Map | undefined;
let observateurTaille: ResizeObserver | undefined;

function activerMolette() {
  carte?.scrollZoom.enable();
  moletteActive.value = true;
}
function desactiverMolette() {
  carte?.scrollZoom.disable();
}

onMounted(() => {
  if (!conteneur.value) return;

  carte = new maplibregl.Map({
    container: conteneur.value,
    style: STYLE_FOND,
    center: [2.3158, 9.3077],
    zoom: 6,
    attributionControl: { compact: true },
  });
  carte.scrollZoom.disable();
  carte.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

  observateurTaille = new ResizeObserver(() => carte?.resize());
  observateurTaille.observe(conteneur.value);

  if (import.meta.env.DEV) {
    (window as unknown as { __heroMap?: maplibregl.Map }).__heroMap = carte;
  }

  carte.on("load", async () => {
    if (!carte) return;
    try {
      const geoBenin = await fetch("/data/benin-contour.geo.json").then((r) => r.json());

      // Le Benin est tres etroit et tres haut : sans mise en evidence, la carte du monde entiere
      // noierait le pays dans le contexte regional. turf.mask() decoupe un "spotlight" (le monde
      // moins la forme du Benin) en gerant correctement le sens de rotation des anneaux GeoJSON
      // (contrairement a une simple soustraction manuelle de polygones).
      const masque = mask(geoBenin);
      carte.addSource("masque-monde", { type: "geojson", data: masque });
      carte.addLayer({
        id: "masque-monde",
        type: "fill",
        source: "masque-monde",
        paint: { "fill-color": "#0b1a14", "fill-opacity": 0.5 },
      });

      carte.addSource("contour-benin", { type: "geojson", data: geoBenin });
      carte.addLayer({
        id: "contour-benin",
        type: "line",
        source: "contour-benin",
        paint: { "line-color": "#F2A93B", "line-width": 2.5 },
      });

      const [minX, minY, maxX, maxY] = bbox(geoBenin);
      carte.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        // Marge haute genereuse : le texte de la hero (titre, sous-titre, recherche) occupe le
        // haut du cadre, il ne doit pas se retrouver directement sur le contour clair du Benin.
        { padding: { top: 280, bottom: 40, left: 40, right: 40 }, duration: 0 },
      );
    } catch (erreur) {
      console.error("HeroCarteBenin: repli sur centre fixe —", erreur);
      // Repli honnete si le contour local est indisponible : au moins centre sur le Benin.
      carte.setCenter([2.35, 9.3]);
      carte.setZoom(6.4);
    }
  });
});

onBeforeUnmount(() => {
  observateurTaille?.disconnect();
  carte?.remove();
});
</script>

<template>
  <!-- Un seul niveau, sans wrapper absolute : maplibre-gl.css impose de toute facon
       "position:relative" sur l'element passe a new maplibregl.Map() (classe .maplibregl-map),
       donc ce conteneur ne peut pas lui-meme etre en absolute inset-0. h-full/w-full suffit ici
       puisqu'il est le premier enfant en flux normal de la section (position:relative, hauteur
       fixe) : il en occupe toute la surface sans avoir besoin d'etre positionne. -->
  <div
    ref="conteneur"
    class="h-full w-full"
    role="application"
    aria-label="Carte du Benin (apercu) — recherchez votre parcelle ci-dessus pour l'outil complet"
    @click="activerMolette"
    @mouseleave="desactiverMolette"
  />
  <span
    class="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white transition-opacity"
    :class="moletteActive ? 'opacity-0' : 'opacity-100'"
  >
    Cliquez sur la carte pour zoomer a la molette
  </span>
</template>
