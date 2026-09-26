<script setup lang="ts">
withDefaults(defineProps<{ id: string; label: string; modelValue: boolean; disabled?: boolean }>(), { disabled: false });

defineEmits<{ "update:modelValue": [boolean] }>();
</script>

<template>
  <label
    :for="id"
    class="flex min-h-0 items-center gap-2 text-sm text-texte"
    :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
  >
    <input
      :id="id"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      class="case"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    {{ label }}
  </label>
</template>

<style scoped>
/* Case personnalisee : le rendu par defaut du navigateur (carre bleu) jure avec le reste de
   l'interface. min-width/min-height a 0 neutralise la regle globale de cible tactile (voir
   tokens.css, "Cibles tactiles genereuses") — le vrai confort tactile reste porte par le label
   englobant, deja assez grand pour etre cliquable au doigt. */
.case {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  min-width: 0;
  min-height: 0;
  margin: 0;
  border: 1.5px solid rgb(var(--color-bordure));
  border-radius: 0.3rem;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.case:hover:not(:disabled) {
  border-color: rgb(var(--color-primaire));
}
.case:checked {
  background: rgb(var(--color-primaire));
  border-color: rgb(var(--color-primaire));
}
.case:checked::after {
  content: "";
  position: absolute;
  top: 46%;
  left: 50%;
  width: 0.28rem;
  height: 0.5rem;
  border: solid rgb(var(--color-primaire-contraste));
  border-width: 0 1.5px 1.5px 0;
  transform: translate(-50%, -58%) rotate(45deg);
}
.case:disabled {
  cursor: not-allowed;
}
.case:focus-visible {
  outline: 2px solid rgb(var(--color-primaire) / 0.4);
  outline-offset: 2px;
}
</style>
