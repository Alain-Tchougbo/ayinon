<script setup lang="ts">
import { CircleCheck, PenLine, Ruler, TriangleAlert } from "@lucide/vue";
import type { GeoJsonPolygon } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { detecterChevauchementLocal, type ConflitLocal } from "../../composables/useOverlapDetection";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

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
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Import de plan de bornage"
      description="La detection de chevauchement geometrique est calculee automatiquement par PostGIS contre toutes les parcelles mitoyennes deja enregistrees."
    >
      <template #icone><Ruler :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="importerBornage">
        <div>
          <label for="parcelle" class="mb-1 block text-sm font-medium text-texte">Parcelle concernee</label>
          <select id="parcelle" v-model="parcelleId" class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte">
            <option value="" disabled>Choisir une parcelle (NUP)</option>
            <option v-for="p in parcelles.parcelles" :key="p.id" :value="p.id">{{ p.nup }} — {{ p.commune }}</option>
          </select>
        </div>

        <BaseInput id="dossier" v-model="referenceDossier" label="Reference dossier" required />

        <div>
          <div class="mb-1 flex items-center justify-between">
            <label for="geometrie" class="block text-sm font-medium text-texte">Geometrie du plan (GeoJSON Polygon)</label>
            <button type="button" class="min-h-0 text-xs font-medium text-primaire underline underline-offset-2 disabled:opacity-40" :disabled="!parcelleId" @click="genererPolygoneDemo">
              Pre-remplir un exemple (demo)
            </button>
          </div>
          <textarea
            id="geometrie"
            v-model="geometrieTexte"
            rows="6"
            required
            class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 font-mono text-xs text-texte"
            @input="preverifierLocalement"
          />
        </div>

        <p v-if="conflitsLocaux.length > 0" class="flex items-start gap-2 rounded-carte border border-accent/30 bg-accent/10 p-3 text-xs text-texte">
          <TriangleAlert :size="16" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          Pre-verification locale : chevauchement probable avec {{ conflitsLocaux.map((c) => c.nup).join(", ") }}.
          Confirmation officielle par le serveur a l'import.
        </p>

        <BaseButton type="submit" :disabled="enCours">Importer et analyser</BaseButton>
      </form>
    </BaseCard>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard v-if="resultatServeur" :accentue="resultatServeur.chevauchementDetecte ? 'danger' : 'succes'">
      <p class="flex items-center gap-2 font-bold" :class="resultatServeur.chevauchementDetecte ? 'text-danger' : 'text-succes'">
        <TriangleAlert v-if="resultatServeur.chevauchementDetecte" :size="20" aria-hidden="true" />
        <CircleCheck v-else :size="20" aria-hidden="true" />
        {{ resultatServeur.chevauchementDetecte ? "Chevauchement detecte (PostGIS)" : "Aucun chevauchement" }}
      </p>
      <ul v-if="resultatServeur.chevauchementDetecte" class="mt-2 space-y-0.5 text-sm text-texte">
        <li v-for="conflit in resultatServeur.parcellesEnConflit" :key="conflit.id">
          Parcelle {{ conflit.nup }} — intersection de {{ Math.round(conflit.aireIntersectionM2) }} m²
        </li>
      </ul>

      <div v-if="!resultatServeur.chevauchementDetecte && !planSigne" class="mt-4 flex flex-wrap items-end gap-2.5">
        <div class="w-44">
          <BaseInput id="ogeb" v-model="numeroOrdreOgeb" label="Numero d'ordre OGEB" />
        </div>
        <BaseButton taille="sm" @click="signerPlan">
          <PenLine :size="15" aria-hidden="true" />
          Signer le plan (Ed25519)
        </BaseButton>
      </div>
      <p v-if="planSigne" class="mt-3 flex items-center gap-1.5 text-sm font-medium text-succes">
        <CircleCheck :size="16" aria-hidden="true" />
        Plan signe et scelle cryptographiquement.
      </p>
    </BaseCard>
  </div>
</template>
