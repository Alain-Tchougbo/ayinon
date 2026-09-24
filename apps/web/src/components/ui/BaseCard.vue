<script setup lang="ts">
interface Props {
  accentue?: "aucun" | "danger" | "accent" | "succes";
  rembourrage?: "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), { accentue: "aucun", rembourrage: "md" });

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
  <div
    class="rounded-carte border shadow-carte"
    :class="[BORDURES[accentue], FONDS[accentue], rembourrage === 'md' ? 'p-5' : 'p-3']"
  >
    <slot />
  </div>
</template>
