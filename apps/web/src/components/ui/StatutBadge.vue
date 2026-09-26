<script setup lang="ts">
import type { StatutParcelle } from "@ayinon/shared";
import { computed } from "vue";

const props = defineProps<{ statut: StatutParcelle }>();

const LIBELLES: Record<StatutParcelle, string> = {
  TITREE: "Titree et securisee",
  EN_COURS: "En cours de securisation",
  GEL_CSAF: "Gel conservatoire (CSAF)",
  DOMAINE_PUBLIC: "Domaine public",
};

const CLASSES_POINT: Record<StatutParcelle, string> = {
  TITREE: "bg-statut-titree",
  EN_COURS: "bg-statut-en-cours",
  GEL_CSAF: "bg-statut-gel",
  DOMAINE_PUBLIC: "bg-statut-domaine-public",
};

const libelle = computed(() => LIBELLES[props.statut]);
const classePoint = computed(() => CLASSES_POINT[props.statut]);
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-sm">
    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="classePoint" aria-hidden="true" />
    {{ libelle }}
  </span>
</template>
