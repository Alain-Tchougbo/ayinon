<script setup lang="ts">
import { Volume2, VolumeX } from "@lucide/vue";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import BaseButton from "../ui/BaseButton.vue";

// La langue vocale se choisit desormais dans l'en-tete (App.vue), aux cotes du theme : cette
// barre ne porte plus qu'un seul declencheur explicite. Rien ici ne parle sans que l'utilisateur
// ait clique ce bouton — voir composables/useVoiceAssistant.ts et les vues (definirPhraseCourante
// enregistre la phrase disponible, mais ne la lit jamais automatiquement).
const { lire, enLecture, phraseCourante } = useVoiceAssistant();
</script>

<template>
  <div
    class="sticky bottom-0 z-20 border-t border-bordure bg-surface-haute px-4 py-2.5 shadow-flottant"
    role="region"
    aria-label="Assistant audio"
  >
    <div class="mx-auto flex max-w-7xl items-center gap-3">
      <BaseButton
        taille="sm"
        class="min-h-0 shrink-0 py-2.5"
        aria-label="Ecouter cette page"
        :aria-pressed="enLecture"
        @click="lire(phraseCourante)"
      >
        <Volume2 v-if="enLecture" :size="18" aria-hidden="true" />
        <VolumeX v-else :size="18" aria-hidden="true" />
        Ecouter cette page
      </BaseButton>

      <p class="hidden flex-1 truncate text-xs text-texte-attenue sm:block">{{ phraseCourante.texteFr }}</p>
    </div>
  </div>
</template>
