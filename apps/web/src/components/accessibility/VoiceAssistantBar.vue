<script setup lang="ts">
import { LangueAssistantVocal } from "@ayinon/shared";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";

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
    class="sticky bottom-0 z-20 border-t border-bordure bg-surface-haute px-4 py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
    role="region"
    aria-label="Assistant audio multimodal"
  >
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
      <button
        type="button"
        class="flex items-center gap-2 rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste"
        :aria-pressed="enLecture"
        @click="lire(phraseCourante)"
      >
        <span aria-hidden="true">{{ enLecture ? "🔊" : "🔈" }}</span>
        Ecouter cette page
      </button>

      <div class="flex items-center gap-1" role="group" aria-label="Choix de la langue vocale">
        <button
          v-for="langue in LANGUES"
          :key="langue.valeur"
          type="button"
          class="rounded-carte border px-2 py-1 text-xs font-medium"
          :class="
            languePreferee === langue.valeur
              ? 'border-primaire bg-primaire text-primaire-contraste'
              : 'border-bordure bg-surface text-texte'
          "
          @click="definirLangue(langue.valeur)"
        >
          {{ langue.label }}
        </button>
      </div>

      <p class="hidden flex-1 truncate text-xs text-texte-attenue sm:block">{{ phraseCourante.texteFr }}</p>
    </div>
  </div>
</template>
