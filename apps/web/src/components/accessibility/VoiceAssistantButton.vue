<script setup lang="ts">
import { Volume2, VolumeX } from "@lucide/vue";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";

// Bouton flottant plutot qu'une barre occupant en permanence toute la largeur : l'assistance
// vocale reste disponible partout sans jamais s'imposer visuellement. Rien ne parle sans que
// l'utilisateur ait clique ce bouton — voir composables/useVoiceAssistant.ts et les vues
// (definirPhraseCourante enregistre la phrase disponible, mais ne la lit jamais automatiquement).
const { lire, enLecture, phraseCourante } = useVoiceAssistant();
</script>

<template>
  <button
    type="button"
    class="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primaire text-primaire-contraste shadow-flottant transition-colors hover:bg-primaire-hover"
    :class="{ 'ring-4 ring-primaire/30': enLecture }"
    :aria-label="enLecture ? 'Arreter la lecture de cette page' : 'Ecouter cette page'"
    :aria-pressed="enLecture"
    :title="phraseCourante.texteFr"
    @click="lire(phraseCourante)"
  >
    <VolumeX v-if="enLecture" :size="22" aria-hidden="true" />
    <Volume2 v-else :size="22" aria-hidden="true" />
  </button>
</template>
