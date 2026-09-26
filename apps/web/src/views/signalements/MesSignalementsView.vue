<script setup lang="ts">
import { ScrollText } from "@lucide/vue";
import { onMounted, ref } from "vue";
import BaseCard from "../../components/ui/BaseCard.vue";
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
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Mes signalements"
      description="Suivez l'avancement de vos signalements et contestations, sans acceder aux pieces reservees aux autorites competentes."
    >
      <template #icone><ScrollText :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="mesSignalements.length === 0" class="text-sm text-texte-attenue">Vous n'avez depose aucun signalement pour le moment.</p>

    <ul v-else class="space-y-3">
      <li v-for="s in mesSignalements" :key="s.id">
        <BaseCard rembourrage="sm">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-semibold text-texte">{{ s.parcelle.nup }} — {{ s.parcelle.commune }}</p>
              <p class="text-xs text-texte-attenue">{{ LIBELLE_TYPE[s.type] }} — depose le {{ new Date(s.createdAt).toLocaleDateString("fr-FR") }}</p>
            </div>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[s.statut]">{{ LIBELLE_STATUT[s.statut] }}</span>
          </div>
          <p class="mt-1.5 text-xs text-texte-attenue">« {{ s.motif }} »</p>
          <p v-if="s.statut !== 'DEPOSE' && s.decisionMotif" class="mt-1.5 text-xs text-texte">Decision : {{ s.decisionMotif }}</p>
          <p v-if="s.statut === 'FONDE' && s.type === 'LITIGE_FONCIER'" class="mt-2 text-xs text-primaire">
            Transmis au magistrat CSAF pour instruction.
          </p>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
