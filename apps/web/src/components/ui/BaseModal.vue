<script setup lang="ts">
import { X } from "@lucide/vue";
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps<{ modelValue: boolean; titre: string }>();
const emit = defineEmits<{ "update:modelValue": [boolean] }>();

function fermer() {
  emit("update:modelValue", false);
}

function surEchap(evenement: KeyboardEvent) {
  if (evenement.key === "Escape" && props.modelValue) fermer();
}

onMounted(() => document.addEventListener("keydown", surEchap));
onBeforeUnmount(() => document.removeEventListener("keydown", surEchap));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-texte/40" @click="fermer" />
        <div
          class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-carte border border-bordure bg-surface p-5 shadow-flottant"
          role="dialog"
          aria-modal="true"
          :aria-label="titre"
        >
          <div class="mb-4 flex items-center justify-between gap-2">
            <h2 class="font-semibold text-texte">{{ titre }}</h2>
            <button
              type="button"
              class="flex h-8 w-8 min-h-0 items-center justify-center rounded-full text-texte-attenue hover:bg-fond hover:text-texte"
              aria-label="Fermer"
              @click="fermer"
            >
              <X :size="18" aria-hidden="true" />
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
