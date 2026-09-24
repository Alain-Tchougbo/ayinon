<script setup lang="ts">
import { Landmark, TriangleAlert } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { api } from "../../services/api";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface StatistiquesPole {
  pole: string;
  libelle: string;
  totalParcelles: number;
  superficieTotaleM2: number;
  parStatut: Record<string, number>;
  conflitsCsafActifs: number;
}

const stats = ref<StatistiquesPole[]>([]);
const chargement = ref(true);

const REPARTITION = [
  { cle: "TITREE", label: "Titrees", couleur: "bg-statut-titree" },
  { cle: "EN_COURS", label: "En cours", couleur: "bg-statut-en-cours" },
  { cle: "GEL_CSAF", label: "Gel CSAF", couleur: "bg-statut-gel" },
  { cle: "DOMAINE_PUBLIC", label: "Domaine public", couleur: "bg-statut-domaine-public" },
];

onMounted(async () => {
  stats.value = await api.get<StatistiquesPole[]>("/andf/statistiques-poles");
  chargement.value = false;
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <PageHeader titre="Console de pilotage decentralisee" description="Six poles territoriaux — suivi du zonage et de l'integrite fonciere.">
      <template #icone><Landmark :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="chargement" class="text-sm text-texte-attenue">Chargement...</p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard v-for="pole in stats" :key="pole.pole">
        <h2 class="font-semibold text-texte">{{ pole.libelle }}</h2>
        <p class="mt-1.5 text-2xl font-bold text-primaire">{{ pole.totalParcelles }}</p>
        <p class="text-xs text-texte-attenue">parcelles enregistrees — {{ Math.round(pole.superficieTotaleM2).toLocaleString("fr-FR") }} m²</p>

        <ul class="mt-3.5 space-y-1.5 border-t border-bordure pt-3 text-xs">
          <li v-for="ligne in REPARTITION" :key="ligne.cle" class="flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-texte-attenue">
              <span class="h-2 w-2 rounded-full" :class="ligne.couleur" aria-hidden="true" />
              {{ ligne.label }}
            </span>
            <span class="font-medium text-texte">{{ pole.parStatut[ligne.cle] ?? 0 }}</span>
          </li>
        </ul>

        <p v-if="pole.conflitsCsafActifs > 0" class="mt-3.5 flex items-center gap-1.5 rounded-carte bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger">
          <TriangleAlert :size="14" aria-hidden="true" />
          {{ pole.conflitsCsafActifs }} conflit(s) CSAF actif(s)
        </p>
      </BaseCard>
    </div>
  </div>
</template>
