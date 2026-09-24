<script setup lang="ts">
const STATUTS = [
  { couleur: "bg-statut-titree", label: "Titree et securisee" },
  { couleur: "bg-statut-en-cours", label: "En cours de securisation" },
  { couleur: "bg-statut-gel", label: "Gel conservatoire (CSAF)" },
  { couleur: "bg-statut-domaine-public", label: "Domaine public" },
];
</script>

<template>
  <ul class="flex flex-wrap gap-x-4 gap-y-2 rounded-carte border border-bordure bg-surface p-3 text-sm">
    <li v-for="statut in STATUTS" :key="statut.label" class="flex items-center gap-2">
      <span class="h-3.5 w-3.5 shrink-0 rounded-sm" :class="statut.couleur" aria-hidden="true" />
      {{ statut.label }}
    </li>
  </ul>
</template>
