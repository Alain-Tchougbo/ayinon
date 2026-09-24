<script setup lang="ts">
import { Map } from "@lucide/vue";
import { onMounted } from "vue";
import LegendeStatuts from "../components/map/LegendeStatuts.vue";
import MapCadastral from "../components/map/MapCadastral.vue";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useParcellesStore } from "../stores/parcelles.store";
import { PHRASES } from "../voice/phrases";
import PageHeader from "../components/ui/PageHeader.vue";

const parcelles = useParcellesStore();
const { definirPhraseCourante, lire } = useVoiceAssistant();

onMounted(async () => {
  definirPhraseCourante(PHRASES.carteIntro);
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
  <div class="mx-auto flex h-full max-w-7xl flex-col gap-3 px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <PageHeader titre="Carte cadastrale nationale">
        <template #icone><Map :size="20" class="text-primaire" aria-hidden="true" /></template>
      </PageHeader>
      <span v-if="parcelles.horsLigne" class="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        Donnees issues du cache local (hors-ligne)
      </span>
    </div>
    <LegendeStatuts />
    <div class="relative flex min-h-[320px] flex-1">
      <div
        v-if="parcelles.chargement"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-carte bg-fond/70 text-sm font-medium text-texte-attenue"
        role="status"
      >
        Chargement de la carte cadastrale…
      </div>
      <div
        v-else-if="parcelles.parcelles.length === 0"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-carte border border-dashed border-bordure bg-surface text-sm text-texte-attenue"
      >
        Aucune parcelle disponible pour le moment.
      </div>
      <MapCadastral :parcelles="parcelles.parcelles" @selection="surSelection" />
    </div>
  </div>
</template>
