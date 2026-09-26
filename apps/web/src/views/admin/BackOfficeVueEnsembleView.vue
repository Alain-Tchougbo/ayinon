<script setup lang="ts">
import { Banknote, FileStack, LayoutDashboard, MapPin, ScrollText, UserRoundSearch, Users } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface VueEnsemble {
  utilisateursParRole: Array<{ role: string; total: number }>;
  parcellesParStatut: Array<{ statut: string; total: number }>;
  totalConventions: number;
  totalTitres: number;
  hypothequesActives: number;
  totalProprietaires: number;
}

const { definirPhraseCourante } = useVoiceAssistant();
const vueEnsemble = ref<VueEnsemble | null>(null);
const chargement = ref(false);
const erreur = ref<string | null>(null);

/** Registre foncier : les 4 seuls compteurs qui sont de vraies mesures uniques (pas une
 * repartition) - cartes stats, meme langage visuel que le tableau de bord (voir AccueilView.vue). */
const statistiques = computed(() => {
  if (!vueEnsemble.value) return [];
  return [
    { icone: UserRoundSearch, label: "Proprietaires", valeur: vueEnsemble.value.totalProprietaires },
    { icone: FileStack, label: "Conventions", valeur: vueEnsemble.value.totalConventions },
    { icone: ScrollText, label: "Titres delivres", valeur: vueEnsemble.value.totalTitres },
    { icone: Banknote, label: "Hypotheques actives", valeur: vueEnsemble.value.hypothequesActives },
  ];
});

onMounted(async () => {
  definirPhraseCourante(PHRASES.adminIntro);
  chargement.value = true;
  try {
    vueEnsemble.value = await api.get<VueEnsemble>("/admin/vue-ensemble");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <PageHeader titre="Back-office AYINON" description="Vue d'ensemble de la plateforme.">
      <template #icone><LayoutDashboard :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <template v-if="!chargement && vueEnsemble">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BaseCard v-for="stat in statistiques" :key="stat.label" rembourrage="sm">
          <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primaire/10 text-primaire">
            <component :is="stat.icone" :size="18" aria-hidden="true" />
          </span>
          <p class="mt-3 text-xs font-bold uppercase tracking-wide text-texte-attenue">{{ stat.label }}</p>
          <p class="mt-1 font-affichage text-2xl font-semibold text-texte">{{ stat.valeur }}</p>
        </BaseCard>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <BaseCard>
          <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
            <Users :size="17" class="text-primaire" aria-hidden="true" />
            Utilisateurs par role
          </h2>
          <ul class="divide-y divide-bordure">
            <li v-for="u in vueEnsemble.utilisateursParRole" :key="u.role" class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <span class="text-sm text-texte-attenue">{{ u.role.replaceAll("_", " ") }}</span>
              <span class="rounded-full bg-primaire/10 px-2.5 py-0.5 text-xs font-bold text-primaire">{{ u.total }}</span>
            </li>
          </ul>
        </BaseCard>
        <BaseCard>
          <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
            <MapPin :size="17" class="text-primaire" aria-hidden="true" />
            Parcelles par statut
          </h2>
          <ul class="divide-y divide-bordure">
            <li v-for="p in vueEnsemble.parcellesParStatut" :key="p.statut" class="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <span class="text-sm text-texte-attenue">{{ p.statut.replaceAll("_", " ") }}</span>
              <span class="rounded-full bg-primaire/10 px-2.5 py-0.5 text-xs font-bold text-primaire">{{ p.total }}</span>
            </li>
          </ul>
        </BaseCard>
      </div>
    </template>
  </div>
</template>
