<script setup lang="ts">
import { Map } from "@lucide/vue";
import { onMounted } from "vue";
import LegendeStatuts from "../components/map/LegendeStatuts.vue";
import MapCadastral from "../components/map/MapCadastral.vue";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useParcellesStore } from "../stores/parcelles.store";
import { PHRASES } from "../voice/phrases";

const parcelles = useParcellesStore();
const { definirPhraseCourante, lire } = useVoiceAssistant();

onMounted(async () => {
  definirPhraseCourante(PHRASES.rechercheParcelle);
  await parcelles.chargerToutes();
});

const PHRASE_PAR_STATUT: Record<string, (typeof PHRASES)[keyof typeof PHRASES]> = {
  TITREE: PHRASES.parcelleTitree,
  EN_COURS: PHRASES.parcelleEnCours,
  GEL_CSAF: PHRASES.parcelleGelCsaf,
  DOMAINE_PUBLIC: PHRASES.parcelleDomainePublic,
};

function surSelection(parcelle: { statut: string }) {
  const phrase = PHRASE_PAR_STATUT[parcelle.statut];
  if (phrase) lire(phrase);
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-220px)] max-w-7xl flex-col gap-3 px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="flex items-center gap-2 text-lg font-bold text-primaire">
        <Map :size="20" aria-hidden="true" />
        Carte cadastrale nationale
      </h1>
      <span v-if="parcelles.horsLigne" class="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        Donnees issues du cache local (hors-ligne)
      </span>
    </div>
    <LegendeStatuts />
    <div class="min-h-0 flex-1">
      <MapCadastral :parcelles="parcelles.parcelles" @selection="surSelection" />
    </div>
  </div>
</template>
