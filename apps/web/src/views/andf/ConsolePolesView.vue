<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../../services/api";

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

onMounted(async () => {
  stats.value = await api.get<StatistiquesPole[]>("/andf/statistiques-poles");
  chargement.value = false;
});
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4">
    <div>
      <h1 class="text-xl font-bold text-primaire">Console de pilotage decentralisee</h1>
      <p class="mt-1 text-sm text-texte-attenue">Six poles territoriaux — suivi du zonage et de l'integrite fonciere.</p>
    </div>

    <p v-if="chargement" class="text-sm text-texte-attenue">Chargement...</p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="pole in stats" :key="pole.pole" class="rounded-carte border border-bordure bg-surface p-4">
        <h2 class="font-semibold">{{ pole.libelle }}</h2>
        <p class="mt-1 text-2xl font-bold text-primaire">{{ pole.totalParcelles }}</p>
        <p class="text-xs text-texte-attenue">parcelles enregistrees — {{ Math.round(pole.superficieTotaleM2).toLocaleString("fr-FR") }} m²</p>

        <ul class="mt-3 space-y-1 text-xs">
          <li class="flex justify-between"><span>🟢 Titrees</span><span>{{ pole.parStatut.TITREE ?? 0 }}</span></li>
          <li class="flex justify-between"><span>🟡 En cours</span><span>{{ pole.parStatut.EN_COURS ?? 0 }}</span></li>
          <li class="flex justify-between"><span>🔴 Gel CSAF</span><span>{{ pole.parStatut.GEL_CSAF ?? 0 }}</span></li>
          <li class="flex justify-between"><span>🔵 Domaine public</span><span>{{ pole.parStatut.DOMAINE_PUBLIC ?? 0 }}</span></li>
        </ul>

        <p v-if="pole.conflitsCsafActifs > 0" class="mt-3 rounded-carte bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
          {{ pole.conflitsCsafActifs }} conflit(s) CSAF actif(s)
        </p>
      </div>
    </div>
  </div>
</template>
