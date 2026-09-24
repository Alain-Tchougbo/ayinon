<script setup lang="ts">
import { Languages, Volume2, VolumeX } from "@lucide/vue";
import { LangueAssistantVocal } from "@ayinon/shared";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import BaseButton from "../ui/BaseButton.vue";

const LANGUES: Array<{ valeur: LangueAssistantVocal; label: string }> = [
  { valeur: LangueAssistantVocal.FR, label: "Francais" },
  { valeur: LangueAssistantVocal.FON, label: "Fɔngbe" },
  { valeur: LangueAssistantVocal.YORUBA, label: "Yorùbá" },
  { valeur: LangueAssistantVocal.BARIBA, label: "Bariba" },
];

const { languePreferee, definirLangue, lire, enLecture, phraseCourante } = useVoiceAssistant();
</script>

<template>
  <div
    class="sticky bottom-0 z-20 border-t border-bordure bg-surface-haute px-4 py-2.5 shadow-flottant"
    role="region"
    aria-label="Assistant audio multimodal"
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
        <span class="hidden sm:inline" aria-hidden="true">Ecouter cette page</span>
      </BaseButton>

      <!-- overflow-x-auto plutot que flex-wrap : la barre garde toujours une hauteur d'une seule ligne,
           y compris sur les plus petits ecrans, au prix d'un defilement horizontal des langues. -->
      <div class="flex min-w-0 items-center gap-1.5 overflow-x-auto border-l border-bordure pl-3" role="group" aria-label="Choix de la langue vocale">
        <Languages :size="16" class="hidden shrink-0 text-texte-attenue sm:block" aria-hidden="true" />
        <button
          v-for="langue in LANGUES"
          :key="langue.valeur"
          type="button"
          class="min-h-0 shrink-0 rounded-carte border px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            languePreferee === langue.valeur
              ? 'border-primaire bg-primaire text-primaire-contraste'
              : 'border-bordure bg-surface text-texte hover:bg-fond'
          "
          :aria-pressed="languePreferee === langue.valeur"
          @click="definirLangue(langue.valeur)"
        >
          {{ langue.label }}
        </button>
      </div>

      <p class="hidden flex-1 truncate text-xs text-texte-attenue lg:block">{{ phraseCourante.texteFr }}</p>
    </div>
  </div>
</template>
