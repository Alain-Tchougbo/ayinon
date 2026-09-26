<script setup lang="ts">
import { CircleCheck, ListClock, PenLine, Ruler, TriangleAlert, Upload } from "@lucide/vue";
import type { GeoJsonPolygon } from "@ayinon/shared";
import { area as calculerAireTurf, polygon as polygoneTurf } from "@turf/turf";
import { computed, onMounted, ref } from "vue";
import { detecterChevauchementLocal, type ConflitLocal } from "../../composables/useOverlapDetection";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ReponseImport {
  planBornageId: string;
  chevauchementDetecte: boolean;
  parcellesEnConflit: Array<{ id: string; nup: string; aireIntersectionM2: number }>;
}
interface MonImport {
  id: string;
  referenceDossier: string;
  chevauchementDetecte: boolean;
  numeroOrdreOgeb: string | null;
  signeParId: string | null;
  createdAt: string;
  parcelle: { id: string; nup: string; commune: string };
}

const parcelles = useParcellesStore();
const { definirPhraseCourante } = useVoiceAssistant();
const mesImports = ref<MonImport[]>([]);
const chargementMesImports = ref(false);

async function chargerMesImports() {
  chargementMesImports.value = true;
  try {
    mesImports.value = await api.get<MonImport[]>("/geometre/mes-imports");
  } finally {
    chargementMesImports.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.geometreIntro);
  parcelles.chargerToutes();
  chargerMesImports();
});

const enDev = import.meta.env.DEV;

const parcelleId = ref("");
const referenceDossier = ref("");
const geometrieTexte = ref("");
const numeroOrdreOgeb = ref("OGEB-512");
const fichierInput = ref<HTMLInputElement>();
const erreurFichier = ref<string | null>(null);

const conflitsLocaux = ref<ConflitLocal[]>([]);
const resultatServeur = ref<ReponseImport | null>(null);
const erreur = ref<string | null>(null);
const enCours = ref(false);
const planSigne = ref(false);

const parcelleSelectionnee = computed(() => parcelles.parcelles.find((p) => p.id === parcelleId.value));

/** Resume lisible calcule localement a chaque frappe : evite d'exposer le JSON brut comme seul retour utilisateur. */
const resumeGeometrie = computed(() => {
  try {
    const geometrie = JSON.parse(geometrieTexte.value) as GeoJsonPolygon;
    const anneau = geometrie.coordinates?.[0];
    if (!anneau || anneau.length < 4) return null;
    const nombreSommets = anneau.length - 1; // le premier point est repete en dernier (anneau ferme)
    const aireM2 = calculerAireTurf(polygoneTurf(geometrie.coordinates));
    return { nombreSommets, aireM2 };
  } catch {
    return null;
  }
});

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
  preverifierLocalement();
}

function declencherImportFichier() {
  fichierInput.value?.click();
}

async function surFichierChoisi(evenement: Event) {
  erreurFichier.value = null;
  const fichier = (evenement.target as HTMLInputElement).files?.[0];
  if (!fichier) return;
  try {
    const texte = await fichier.text();
    JSON.parse(texte); // valide juste que c'est un JSON lisible ; la structure est verifiee a l'import
    geometrieTexte.value = JSON.stringify(JSON.parse(texte), null, 2);
    preverifierLocalement();
  } catch {
    erreurFichier.value = "Ce fichier n'est pas un GeoJSON valide (JSON illisible).";
  } finally {
    (evenement.target as HTMLInputElement).value = "";
  }
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
    let geometrie: GeoJsonPolygon;
    try {
      geometrie = JSON.parse(geometrieTexte.value) as GeoJsonPolygon;
    } catch {
      throw new Error("Le polygone saisi n'est pas un GeoJSON valide (verifiez les crochets et virgules).");
    }
    resultatServeur.value = await api.post<ReponseImport>("/geometre/bornage", {
      parcelleId: parcelleId.value,
      referenceDossier: referenceDossier.value,
      geometrie,
    });
    await chargerMesImports();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Import impossible";
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
    await chargerMesImports();
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

    <div>
      <p class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <ListClock :size="18" class="text-primaire" aria-hidden="true" />
        Vos imports recents
      </p>
      <p v-if="chargementMesImports" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="mesImports.length === 0" class="text-sm text-texte-attenue">
        Aucun plan de bornage importe pour le moment - le premier apparaitra ici.
      </p>
      <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Parcelle</th>
              <th class="px-4 py-3 font-semibold">Dossier</th>
              <th class="px-4 py-3 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <tr v-for="i in mesImports" :key="i.id" class="align-top">
              <td class="px-4 py-3 font-medium text-texte">{{ i.parcelle.nup }} - {{ i.parcelle.commune }}</td>
              <td class="px-4 py-3 text-xs text-texte-attenue">
                {{ i.referenceDossier }} · {{ new Date(i.createdAt).toLocaleDateString("fr-FR") }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="i.chevauchementDetecte ? 'bg-danger/10 text-danger' : i.signeParId ? 'bg-succes/10 text-succes' : 'bg-accent/10 text-accent'"
                >
                  <component :is="i.chevauchementDetecte ? TriangleAlert : CircleCheck" :size="12" aria-hidden="true" />
                  {{ i.chevauchementDetecte ? "Chevauchement" : i.signeParId ? "Signe" : "A signer" }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="importerBornage">
        <div>
          <label for="parcelle" class="mb-1 block text-sm font-medium text-texte">Parcelle concernee</label>
          <select id="parcelle" v-model="parcelleId" class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte">
            <option value="" disabled>Choisir une parcelle (NUP)</option>
            <option v-for="p in parcelles.parcelles" :key="p.id" :value="p.id">{{ p.nup }} - {{ p.commune }}</option>
          </select>
        </div>

        <BaseInput id="dossier" v-model="referenceDossier" label="Reference dossier" required />

        <div>
          <label class="mb-1 block text-sm font-medium text-texte">Plan de bornage</label>
          <input ref="fichierInput" type="file" accept=".geojson,.json,application/geo+json" class="hidden" @change="surFichierChoisi" />
          <BaseButton type="button" variant="secondaire" @click="declencherImportFichier">
            <Upload :size="16" aria-hidden="true" />
            Importer un fichier (.geojson, .json)
          </BaseButton>
          <p v-if="erreurFichier" class="mt-1.5 text-xs text-danger" role="alert">{{ erreurFichier }}</p>

          <p v-if="resumeGeometrie" class="mt-2.5 flex items-center gap-1.5 text-sm text-texte" role="status">
            <CircleCheck :size="15" class="shrink-0 text-succes" aria-hidden="true" />
            Plan lu : {{ resumeGeometrie.nombreSommets }} sommets, environ
            {{ Math.round(resumeGeometrie.aireM2).toLocaleString("fr-FR") }} m² de superficie.
          </p>
          <p v-else-if="geometrieTexte" class="mt-2.5 text-sm text-danger" role="alert">
            Le contenu importe n'est pas un polygone GeoJSON valide.
          </p>

          <details class="mt-2.5 rounded-carte border border-bordure bg-surface p-3.5 text-sm">
            <summary class="cursor-pointer font-medium text-texte">
              Mode avance : saisir ou modifier les coordonnees (GeoJSON)
            </summary>
            <div class="mt-2.5 flex items-center justify-between">
              <span class="text-xs text-texte-attenue">Coordonnees [longitude, latitude] du polygone</span>
              <button
                v-if="enDev"
                type="button"
                class="min-h-0 text-xs font-medium text-primaire underline underline-offset-2 disabled:opacity-40"
                :disabled="!parcelleId"
                @click="genererPolygoneDemo"
              >
                Pre-remplir un exemple (dev)
              </button>
            </div>
            <textarea
              id="geometrie"
              v-model="geometrieTexte"
              rows="6"
              class="mt-1.5 w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 font-mono text-xs text-texte"
              @input="preverifierLocalement"
            />
          </details>
        </div>

        <p v-if="conflitsLocaux.length > 0" class="flex items-start gap-2 rounded-carte border border-accent/30 bg-accent/10 p-3 text-xs text-texte" role="status">
          <TriangleAlert :size="16" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          Pre-verification locale : chevauchement probable avec {{ conflitsLocaux.map((c) => c.nup).join(", ") }}.
          Confirmation officielle par le serveur a l'import.
        </p>

        <BaseButton type="submit" :disabled="enCours || !geometrieTexte || !parcelleId">Importer et analyser</BaseButton>
      </form>
    </BaseCard>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard v-if="resultatServeur" :accentue="resultatServeur.chevauchementDetecte ? 'danger' : 'succes'" role="status">
      <p class="flex items-center gap-2 font-bold" :class="resultatServeur.chevauchementDetecte ? 'text-danger' : 'text-succes'">
        <TriangleAlert v-if="resultatServeur.chevauchementDetecte" :size="20" aria-hidden="true" />
        <CircleCheck v-else :size="20" aria-hidden="true" />
        {{ resultatServeur.chevauchementDetecte ? "Chevauchement detecte (PostGIS)" : "Aucun chevauchement" }}
      </p>
      <ul v-if="resultatServeur.chevauchementDetecte" class="mt-2 space-y-0.5 text-sm text-texte">
        <li v-for="conflit in resultatServeur.parcellesEnConflit" :key="conflit.id">
          Parcelle {{ conflit.nup }} - intersection de {{ Math.round(conflit.aireIntersectionM2) }} m²
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
