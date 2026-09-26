<script setup lang="ts">
import { ChevronDown, ScrollText, Search } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";

interface MonSignalement {
  id: string;
  type: "ANNONCE" | "LITIGE_FONCIER";
  motif: string;
  descriptif: string | null;
  statut: "DEPOSE" | "FONDE" | "REJETE";
  decisionMotif: string | null;
  createdAt: string;
  parcelle: { nup: string; commune: string };
}

const LIBELLE_TYPE: Record<MonSignalement["type"], string> = { ANNONCE: "Probleme sur une annonce", LITIGE_FONCIER: "Litige foncier" };
const LIBELLE_STATUT: Record<MonSignalement["statut"], string> = {
  DEPOSE: "En attente d'examen",
  FONDE: "Fonde",
  REJETE: "Rejete",
};
const COULEUR_STATUT: Record<MonSignalement["statut"], string> = {
  DEPOSE: "bg-accent/10 text-accent",
  FONDE: "bg-danger/10 text-danger",
  REJETE: "bg-texte-attenue/10 text-texte-attenue",
};

const mesSignalements = ref<MonSignalement[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);

const texteRecherche = ref("");
const statutFiltre = ref<MonSignalement["statut"] | "">("");

const signalementsAffiches = computed(() => {
  const recherche = texteRecherche.value.trim().toLowerCase();
  return mesSignalements.value.filter((s) => {
    const correspondRecherche =
      !recherche || s.parcelle.nup.toLowerCase().includes(recherche) || s.motif.toLowerCase().includes(recherche);
    const correspondStatut = !statutFiltre.value || s.statut === statutFiltre.value;
    return correspondRecherche && correspondStatut;
  });
});

onMounted(async () => {
  chargement.value = true;
  try {
    mesSignalements.value = await api.get<MonSignalement[]>("/signalements/mes-signalements");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger vos signalements";
  } finally {
    chargement.value = false;
  }
});
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Mes signalements"
      description="Suivez l'avancement de vos signalements et contestations, sans acceder aux pieces reservees aux autorites competentes."
    >
      <template #icone><ScrollText :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[16rem] flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="texteRecherche"
          placeholder="Rechercher par NUP ou motif…"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <div class="relative">
        <select
          v-model="statutFiltre"
          class="min-h-0 appearance-none rounded-carte border border-bordure bg-surface py-2 pl-3 pr-8 text-xs font-medium text-texte"
        >
          <option value="">Tous les statuts</option>
          <option v-for="(libelle, statut) in LIBELLE_STATUT" :key="statut" :value="statut">{{ libelle }}</option>
        </select>
        <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
      </div>
    </div>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="mesSignalements.length === 0" class="text-sm text-texte-attenue">Vous n'avez depose aucun signalement pour le moment.</p>
    <p v-else-if="signalementsAffiches.length === 0" class="text-sm text-texte-attenue">Aucun signalement ne correspond a ces filtres.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Reference</th>
            <th class="px-4 py-3 font-semibold">Sujet</th>
            <th class="px-4 py-3 font-semibold">Statut</th>
            <th class="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <tr v-for="s in signalementsAffiches" :key="s.id" class="align-top transition-colors hover:bg-fond/40">
            <td class="whitespace-nowrap px-4 py-3">
              <p class="font-semibold text-texte">{{ s.parcelle.nup }}</p>
              <p class="text-xs text-texte-attenue">{{ s.parcelle.commune }}</p>
            </td>
            <td class="px-4 py-3">
              <p class="font-medium text-texte">{{ LIBELLE_TYPE[s.type] }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">« {{ s.motif }} »</p>
              <p v-if="s.statut !== 'DEPOSE' && s.decisionMotif" class="mt-1 text-xs text-texte">Decision : {{ s.decisionMotif }}</p>
              <p v-if="s.statut === 'FONDE' && s.type === 'LITIGE_FONCIER'" class="mt-1 text-xs text-primaire">
                Transmis au magistrat CSAF pour instruction.
              </p>
            </td>
            <td class="whitespace-nowrap px-4 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[s.statut]">{{ LIBELLE_STATUT[s.statut] }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-xs text-texte-attenue">{{ new Date(s.createdAt).toLocaleDateString("fr-FR") }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
