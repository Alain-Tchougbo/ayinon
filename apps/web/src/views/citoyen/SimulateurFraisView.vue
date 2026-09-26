<script setup lang="ts">
import { Calculator } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseCheckbox from "../../components/ui/BaseCheckbox.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ResultatSimulation {
  droitsEnregistrementFcfa: number;
  emolumentsNotariauxFcfa: number;
  taxeFonciereUniqueAnnuelleFcfa: number;
  totalFcfa: number;
  avertissement: string;
}

const { definirPhraseCourante } = useVoiceAssistant();
onMounted(() => definirPhraseCourante(PHRASES.simulateurIntro));

const valeurDeclareeFcfa = ref(5_000_000);
const superficieM2 = ref(300);
const enZoneUrbaine = ref(true);
const resultat = ref<ResultatSimulation | null>(null);
const erreur = ref<string | null>(null);
const chargement = ref(false);

async function simuler() {
  chargement.value = true;
  erreur.value = null;
  try {
    resultat.value = await api.post<ResultatSimulation>("/parcelles/simuler-frais", {
      valeurDeclareeFcfa: valeurDeclareeFcfa.value,
      superficieM2: superficieM2.value,
      enZoneUrbaine: enZoneUrbaine.value,
    });
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Simulation impossible";
  } finally {
    chargement.value = false;
  }
}

function formaterFcfa(valeur: number) {
  return `${valeur.toLocaleString("fr-FR")} FCFA`;
}

const CHAMP_NUMERIQUE = "mt-1 w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte";
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Simulateur transparent des frais de mutation"
      description="Connaissez le montant exact a payer avant toute transaction - plus de rackets des demarcheurs informels (kpatchi-kpatchi)."
    >
      <template #icone><Calculator :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="simuler">
        <div>
          <label for="valeur" class="block text-sm font-medium text-texte">Valeur declaree de la transaction (FCFA)</label>
          <input id="valeur" v-model.number="valeurDeclareeFcfa" type="number" min="1" :class="CHAMP_NUMERIQUE" />
        </div>
        <div>
          <label for="superficie" class="block text-sm font-medium text-texte">Superficie de la parcelle (m²)</label>
          <input id="superficie" v-model.number="superficieM2" type="number" min="1" :class="CHAMP_NUMERIQUE" />
        </div>
        <BaseCheckbox id="zone" v-model="enZoneUrbaine" label="Zone urbaine" />
        <BaseButton type="submit" :disabled="chargement">Calculer</BaseButton>
      </form>
    </BaseCard>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard v-if="resultat" role="status">
      <div class="space-y-2.5">
        <div class="flex justify-between text-sm">
          <span class="text-texte-attenue">Droits d'enregistrement (DGI)</span>
          <span class="font-medium text-texte">{{ formaterFcfa(resultat.droitsEnregistrementFcfa) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-texte-attenue">Emoluments notaries</span>
          <span class="font-medium text-texte">{{ formaterFcfa(resultat.emolumentsNotariauxFcfa) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-texte-attenue">Taxe Fonciere Unique (annuelle)</span>
          <span class="font-medium text-texte">{{ formaterFcfa(resultat.taxeFonciereUniqueAnnuelleFcfa) }}</span>
        </div>
        <div class="flex justify-between border-t border-bordure pt-2.5 text-base font-bold text-primaire">
          <span>Total estime</span>
          <span>{{ formaterFcfa(resultat.totalFcfa) }}</span>
        </div>
        <p class="pt-1 text-xs text-texte-attenue">{{ resultat.avertissement }}</p>
      </div>
    </BaseCard>
  </div>
</template>
