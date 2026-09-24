<script setup lang="ts">
import { StatutParcelle } from "@ayinon/shared";
import StatutBadge from "../ui/StatutBadge.vue";

const STATUTS = Object.values(StatutParcelle);
</script>

<template>
  <ul class="flex flex-wrap gap-x-5 gap-y-2 rounded-carte border border-bordure bg-surface px-4 py-3 shadow-carte">
    <li v-for="statut in STATUTS" :key="statut">
      <StatutBadge :statut="statut" />
    </li>
  </ul>
</template>
