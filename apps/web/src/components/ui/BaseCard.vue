<script setup lang="ts">
interface Props {
  accentue?: "aucun" | "danger" | "accent" | "succes";
  rembourrage?: "sm" | "md";
  to?: string;
  interactif?: boolean;
}

const props = withDefaults(defineProps<Props>(), { accentue: "aucun", rembourrage: "md", to: undefined, interactif: false });

const BORDURES: Record<NonNullable<Props["accentue"]>, string> = {
  aucun: "border-bordure",
  danger: "border-danger/50",
  accent: "border-accent/50",
  succes: "border-succes/50",
};

const FONDS: Record<NonNullable<Props["accentue"]>, string> = {
  aucun: "bg-surface",
  danger: "bg-danger/5",
  accent: "bg-accent/5",
  succes: "bg-succes/5",
};
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="group block rounded-carte border shadow-carte transition hover:-translate-y-0.5 hover:border-primaire hover:shadow-flottant"
    :class="[BORDURES[accentue], FONDS[accentue], rembourrage === 'md' ? 'p-5' : 'p-3']"
  >
    <slot />
  </RouterLink>
  <div
    v-else
    class="rounded-carte border shadow-carte"
    :class="[BORDURES[accentue], FONDS[accentue], rembourrage === 'md' ? 'p-5' : 'p-3', interactif && 'transition hover:-translate-y-0.5 hover:shadow-flottant']"
  >
    <slot />
  </div>
</template>
