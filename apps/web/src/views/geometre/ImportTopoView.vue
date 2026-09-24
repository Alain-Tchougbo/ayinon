<script setup lang="ts">
import type { GeoJsonPolygon } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { detecterChevauchementLocal, type ConflitLocal } from "../../composables/useOverlapDetection";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";

interface ReponseImport {
  planBornageId: string;
  chevauchementDetecte: boolean;
  parcellesEnConflit: Array<{ id: string; nup: string; aireIntersectionM2: number }>;
}

const parcelles = useParcellesStore();
onMounted(() => parcelles.chargerToutes());

const parcelleId = ref("");
const referenceDossier = ref("");
const geometrieTexte = ref("");
const numeroOrdreOgeb = ref("OGEB-512");

const conflitsLocaux = ref<ConflitLocal[]>([]);
const resultatServeur = ref<ReponseImport | null>(null);
const erreur = ref<string | null>(null);
const enCours = ref(false);
const planSigne = ref(false);

const parcelleSelectionnee = computed(() => parcelles.parcelles.find((p) => p.id === parcelleId.value));

function genererPolygoneDemo() {
  const cible = parcelleSelectionnee.value;
  if (!cible) return;
  const premierPoint = cible.geometrie.coordinates[0]?.[0];
  if (!premierPoint) return;
  const [lon, lat] = premierPoint;
  const demiCote = 0.0004;
  const geometrie: GeoJsonPolygon = {
    type: "Polygon",
    coordinates: [
      [
        [lon - demiCote, lat - demiCote],
        [lon + demiCote, lat - demiCote],
        [lon + demiCote, lat + demiCote],
        [lon - demiCote, lat + demiCote],
        [lon - demiCote, lat - demiCote],
      ],
    ],
  };
  geometrieTexte.value = JSON.stringify(geometrie, null, 2);
}

function preverifierLocalement() {
  if (!parcelleId.value) return;
  try {
    const geometrie = JSON.parse(geometrieTexte.value) as GeoJsonPolygon;
    const voisines = parcelles.parcelles
      .filter((p) => p.id !== parcelleId.value)
      .map((p) => ({ id: p.id, nup: p.nup, geometrie: p.geometrie }));
    conflitsLocaux.value = detecterChevauchementLocal(geometrie, voisines);
  } catch {
    conflitsLocaux.value = [];
  }
}

async function importerBornage() {
  erreur.value = null;
  resultatServeur.value = null;
  planSigne.value = false;
  enCours.value = true;
  try {
    const geometrie = JSON.parse(geometrieTexte.value) as GeoJsonPolygon;
    resultatServeur.value = await api.post<ReponseImport>("/geometre/bornage", {
      parcelleId: parcelleId.value,
      referenceDossier: referenceDossier.value,
      geometrie,
    });
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Geometrie invalide ou import impossible";
  } finally {
    enCours.value = false;
  }
}

async function signerPlan() {
  if (!resultatServeur.value) return;
  erreur.value = null;
  try {
    await api.post("/geometre/bornage/signer", {
      planBornageId: resultatServeur.value.planBornageId,
      numeroOrdreOgeb: numeroOrdreOgeb.value,
    });
    planSigne.value = true;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Signature refusee";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <div>
      <h1 class="text-xl font-bold text-primaire">Import de plan de bornage</h1>
      <p class="mt-1 text-sm text-texte-attenue">
        La detection de chevauchement geometrique est calculee automatiquement par PostGIS contre toutes les
        parcelles mitoyennes deja enregistrees.
      </p>
    </div>

    <form class="space-y-4 rounded-carte border border-bordure bg-surface p-5" @submit.prevent="importerBornage">
      <div>
        <label for="parcelle" class="block text-sm font-medium">Parcelle concernee</label>
        <select id="parcelle" v-model="parcelleId" class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2">
          <option value="" disabled>Choisir une parcelle (NUP)</option>
          <option v-for="p in parcelles.parcelles" :key="p.id" :value="p.id">{{ p.nup }} — {{ p.commune }}</option>
        </select>
      </div>

      <div>
        <label for="dossier" class="block text-sm font-medium">Reference dossier</label>
        <input
          id="dossier"
          v-model="referenceDossier"
          type="text"
          required
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2"
        />
      </div>

      <div>
        <div class="flex items-center justify-between">
          <label for="geometrie" class="block text-sm font-medium">Geometrie du plan (GeoJSON Polygon)</label>
          <button type="button" class="text-xs text-primaire underline" :disabled="!parcelleId" @click="genererPolygoneDemo">
            Pre-remplir un exemple (demo)
          </button>
        </div>
        <textarea
          id="geometrie"
          v-model="geometrieTexte"
          rows="6"
          required
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2 font-mono text-xs"
          @input="preverifierLocalement"
        />
      </div>

      <p v-if="conflitsLocaux.length > 0" class="rounded-carte bg-accent/10 p-3 text-xs text-texte">
        ⚠️ Pre-verification locale : chevauchement probable avec {{ conflitsLocaux.map((c) => c.nup).join(", ") }}.
        Confirmation officielle par le serveur a l'import.
      </p>

      <button type="submit" class="rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste" :disabled="enCours">
        Importer et analyser
      </button>
    </form>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger">{{ erreur }}</p>

    <div
      v-if="resultatServeur"
      class="rounded-carte border p-4"
      :class="resultatServeur.chevauchementDetecte ? 'border-danger bg-danger/10' : 'border-succes bg-succes/10'"
    >
      <p class="font-bold" :class="resultatServeur.chevauchementDetecte ? 'text-danger' : 'text-succes'">
        {{ resultatServeur.chevauchementDetecte ? "⚠️ Chevauchement detecte (PostGIS)" : "✅ Aucun chevauchement" }}
      </p>
      <ul v-if="resultatServeur.chevauchementDetecte" class="mt-2 text-sm">
        <li v-for="conflit in resultatServeur.parcellesEnConflit" :key="conflit.id">
          Parcelle {{ conflit.nup }} — intersection de {{ Math.round(conflit.aireIntersectionM2) }} m²
        </li>
      </ul>

      <div v-if="!resultatServeur.chevauchementDetecte && !planSigne" class="mt-3 flex items-center gap-2">
        <input v-model="numeroOrdreOgeb" type="text" class="w-40 rounded-carte border border-bordure bg-fond px-3 py-2 text-sm" />
        <button type="button" class="rounded-carte bg-primaire px-3 py-2 text-xs font-semibold text-primaire-contraste" @click="signerPlan">
          Signer le plan (scellement Ed25519)
        </button>
      </div>
      <p v-if="planSigne" class="mt-2 text-sm font-medium text-succes">✅ Plan signe et scelle cryptographiquement.</p>
    </div>
  </div>
</template>
