<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";

interface ResultatSimulation {
  droitsEnregistrementFcfa: number;
  emolumentsNotariauxFcfa: number;
  taxeFonciereUniqueAnnuelleFcfa: number;
  totalFcfa: number;
  avertissement: string;
}

const { definirPhraseCourante } = useVoiceAssistant();
onMounted(() => definirPhraseCourante(PHRASES.bienvenue));

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
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 p-4">
    <div>
      <h1 class="text-xl font-bold text-primaire">Simulateur transparent des frais de mutation</h1>
      <p class="mt-1 text-sm text-texte-attenue">
        Connaissez le montant exact a payer avant toute transaction — plus de rackets des demarcheurs informels
        (kpatchi-kpatchi).
      </p>
    </div>

    <form class="space-y-4 rounded-carte border border-bordure bg-surface p-5" @submit.prevent="simuler">
      <div>
        <label for="valeur" class="block text-sm font-medium">Valeur declaree de la transaction (FCFA)</label>
        <input
          id="valeur"
          v-model.number="valeurDeclareeFcfa"
          type="number"
          min="1"
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2"
        />
      </div>
      <div>
        <label for="superficie" class="block text-sm font-medium">Superficie de la parcelle (m²)</label>
        <input
          id="superficie"
          v-model.number="superficieM2"
          type="number"
          min="1"
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2"
        />
      </div>
      <div class="flex items-center gap-2">
        <input id="zone" v-model="enZoneUrbaine" type="checkbox" class="h-5 w-5" />
        <label for="zone" class="text-sm">Zone urbaine</label>
      </div>
      <button type="submit" class="rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste" :disabled="chargement">
        Calculer
      </button>
    </form>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger">{{ erreur }}</p>

    <div v-if="resultat" class="space-y-2 rounded-carte border border-bordure bg-surface p-5">
      <div class="flex justify-between text-sm">
        <span>Droits d'enregistrement (DGI)</span>
        <span class="font-medium">{{ formaterFcfa(resultat.droitsEnregistrementFcfa) }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span>Emoluments notaries</span>
        <span class="font-medium">{{ formaterFcfa(resultat.emolumentsNotariauxFcfa) }}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span>Taxe Fonciere Unique (annuelle)</span>
        <span class="font-medium">{{ formaterFcfa(resultat.taxeFonciereUniqueAnnuelleFcfa) }}</span>
      </div>
      <div class="mt-2 flex justify-between border-t border-bordure pt-2 text-base font-bold text-primaire">
        <span>Total estime</span>
        <span>{{ formaterFcfa(resultat.totalFcfa) }}</span>
      </div>
      <p class="mt-2 text-xs text-texte-attenue">{{ resultat.avertissement }}</p>
    </div>
  </div>
</template>
