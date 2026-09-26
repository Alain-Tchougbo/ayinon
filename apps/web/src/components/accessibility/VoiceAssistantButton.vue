<script setup lang="ts">
import { Volume2, VolumeX } from "@lucide/vue";
import { ref, watch } from "vue";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { LANGUES } from "../../voice/langues";

// Bouton flottant plutot qu'une barre occupant en permanence toute la largeur : l'assistance
// vocale reste disponible partout sans jamais s'imposer visuellement. Rien ne parle sans que
// l'utilisateur ait clique ce bouton - voir composables/useVoiceAssistant.ts et les vues
// (definirPhraseCourante enregistre la phrase disponible, mais ne la lit jamais automatiquement).
const { lire, enLecture, phraseCourante, languePreferee, dernierRepliFrancais } = useVoiceAssistant();

const nomLanguePreferee = () => LANGUES.find((l) => l.valeur === languePreferee.value)?.label ?? languePreferee.value;

// Affichage temporise plutot que lie a enLecture : sur un appareil sans moteur vocal installe,
// speechSynthesis ne declenche jamais onstart/onend, et le repli devrait quand meme etre signale.
const afficherRepli = ref(false);
watch(dernierRepliFrancais, (repli) => {
  if (!repli) return;
  afficherRepli.value = true;
  setTimeout(() => (afficherRepli.value = false), 4000);
});
</script>

<template>
  <div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
    <p
      v-if="afficherRepli"
      role="status"
      class="max-w-[14rem] rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte-attenue shadow-flottant"
    >
      Voix {{ nomLanguePreferee() }} pas encore disponible - lecture en francais.
    </p>
    <button
      type="button"
      class="flex h-14 w-14 items-center justify-center rounded-full bg-primaire text-primaire-contraste shadow-flottant transition-colors hover:bg-primaire-hover"
      :class="{ 'ring-4 ring-primaire/30': enLecture }"
      :aria-label="enLecture ? 'Arreter la lecture de cette page' : 'Ecouter cette page'"
      :aria-pressed="enLecture"
      :title="phraseCourante.texteFr"
      @click="lire(phraseCourante)"
    >
      <VolumeX v-if="enLecture" :size="22" aria-hidden="true" />
      <Volume2 v-else :size="22" aria-hidden="true" />
    </button>
  </div>
</template>
