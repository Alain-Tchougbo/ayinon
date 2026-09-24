<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: "primaire" | "secondaire" | "ghost" | "danger" | "succes";
  taille?: "sm" | "md";
  to?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primaire",
  taille: "md",
  to: undefined,
  type: "button",
  disabled: false,
});

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-carte font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  primaire: "bg-primaire text-primaire-contraste hover:bg-primaire-hover",
  secondaire: "border border-bordure bg-surface text-texte hover:bg-fond",
  ghost: "text-texte hover:bg-fond",
  danger: "bg-danger text-white hover:brightness-110",
  succes: "bg-succes text-white hover:brightness-110",
};

const TAILLES: Record<NonNullable<Props["taille"]>, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

const classes = computed(() => [BASE, VARIANTS[props.variant], TAILLES[props.taille]]);
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes">
    <slot />
  </RouterLink>
  <button v-else :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
