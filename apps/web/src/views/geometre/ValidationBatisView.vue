<script setup lang="ts">
import { Building, CheckCheck, PenLine, Trash } from "@lucide/vue";
import type { GeoJsonPolygon } from "@ayinon/shared";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface BatiAValider {
  id: string;
  source: "IMPORT_IA" | "SAISIE_MANUELLE";
  scoreConfiance: number | null;
  parcelleId: string | null;
  valide: boolean;
  geometrie: GeoJsonPolygon;
}

const parcelles = useParcellesStore();
const batisAValider = ref<BatiAValider[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const enCoursId = ref<string | null>(null);

const parcelleIdSaisie = ref("");
const geometrieTexte = ref("");
const creationEnCours = ref(false);

function nupParcelle(parcelleId: string | null): string {
  if (!parcelleId) return "Aucune parcelle cadastree recoupee";
  return parcelles.parcelles.find((p) => p.id === parcelleId)?.nup ?? parcelleId;
}

async function charger() {
  chargement.value = true;
  try {
    batisAValider.value = await api.get<BatiAValider[]>("/batis/a-valider");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger les batis a valider";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  parcelles.chargerToutes();
  charger();
});

async function valider(id: string) {
  erreur.value = null;
  enCoursId.value = id;
  try {
    await api.patch(`/batis/${id}/valider`, {});
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Validation impossible";
  } finally {
    enCoursId.value = null;
  }
}

async function rejeter(id: string) {
  erreur.value = null;
  enCoursId.value = id;
  try {
    await api.delete(`/batis/${id}`);
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Rejet impossible";
  } finally {
    enCoursId.value = null;
  }
}

async function creerBati() {
  erreur.value = null;
  creationEnCours.value = true;
  try {
    const geometrie = JSON.parse(geometrieTexte.value) as GeoJsonPolygon;
    await api.post("/batis", { geometrie, parcelleId: parcelleIdSaisie.value || undefined });
    geometrieTexte.value = "";
    parcelleIdSaisie.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Saisie impossible (verifiez le GeoJSON)";
  } finally {
    creationEnCours.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Validation des batis"
      description="Les batis detectes automatiquement par imagerie satellite (type Google Open Buildings) restent indicatifs tant qu'un geometre ou un agent ne les a pas valides."
    >
      <template #icone><Building :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="batisAValider.length === 0" class="text-sm text-texte-attenue">Aucun bati en attente de validation.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full table-fixed text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Bati</th>
            <th class="px-4 py-3 font-semibold">Origine</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <tr v-for="b in batisAValider" :key="b.id" class="align-top">
            <td class="px-4 py-3 font-medium text-texte">{{ nupParcelle(b.parcelleId) }}</td>
            <td class="px-4 py-3 text-xs text-texte-attenue">
              <span v-if="b.source === 'IMPORT_IA'">
                Detection IA - confiance {{ b.scoreConfiance !== null ? Math.round(b.scoreConfiance * 100) + "%" : "inconnue" }}
              </span>
              <span v-else>Saisie manuelle</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-col gap-2 sm:flex-row">
                <BaseButton taille="sm" variant="succes" :disabled="enCoursId === b.id" @click="valider(b.id)">
                  <CheckCheck :size="14" aria-hidden="true" /> Valider
                </BaseButton>
                <BaseButton v-if="b.source === 'IMPORT_IA'" taille="sm" variant="danger" :disabled="enCoursId === b.id" @click="rejeter(b.id)">
                  <Trash :size="14" aria-hidden="true" /> Rejeter
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseCard>
      <p class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <PenLine :size="18" class="text-primaire" aria-hidden="true" /> Saisir un bati manuellement
      </p>
      <form class="space-y-3" @submit.prevent="creerBati">
        <div>
          <label for="parcelle-bati" class="mb-1 block text-sm font-medium text-texte">Parcelle concernee (optionnel)</label>
          <select id="parcelle-bati" v-model="parcelleIdSaisie" class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte">
            <option value="">Aucune parcelle particuliere</option>
            <option v-for="p in parcelles.parcelles" :key="p.id" :value="p.id">{{ p.nup }} - {{ p.commune }}</option>
          </select>
        </div>
        <div>
          <label for="geometrie-bati" class="mb-1 block text-sm font-medium text-texte">Contour du bati (GeoJSON Polygon)</label>
          <textarea
            id="geometrie-bati"
            v-model="geometrieTexte"
            rows="5"
            placeholder='{"type":"Polygon","coordinates":[[...]]}'
            class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 font-mono text-xs text-texte"
          />
        </div>
        <BaseButton type="submit" :disabled="creationEnCours || !geometrieTexte">Enregistrer le bati</BaseButton>
      </form>
    </BaseCard>
  </div>
</template>
