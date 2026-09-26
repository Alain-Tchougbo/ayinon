<script setup lang="ts">
import { CheckCheck, Sprout } from "@lucide/vue";
import { LIBELLE_TYPE_USAGE_SOL, TypeUsageSol } from "@ayinon/shared";
import { onMounted, reactive, ref } from "vue";
import { ApiError, api } from "../../services/api";
import BaseButton from "../../components/ui/BaseButton.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ParcelleAValider {
  id: string;
  nup: string;
  commune: string;
  usageSolIndicatif: string | null;
  usageSolValide: string | null;
}

const parcellesAValider = ref<ParcelleAValider[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const enCoursId = ref<string | null>(null);
const choix = reactive<Record<string, string>>({});

async function charger() {
  chargement.value = true;
  try {
    parcellesAValider.value = await api.get<ParcelleAValider[]>("/parcelles/a-valider-usage-sol");
    for (const p of parcellesAValider.value) {
      choix[p.id] = p.usageSolIndicatif ?? TypeUsageSol.AUTRE;
    }
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger la file de validation";
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function confirmer(id: string) {
  erreur.value = null;
  enCoursId.value = id;
  try {
    await api.patch(`/parcelles/${id}/usage-sol`, { usageSol: choix[id] });
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Confirmation impossible";
  } finally {
    enCoursId.value = null;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Validation de l'occupation du sol"
      description="L'usage du sol indicatif est derive d'un calque satellite (type ESA WorldCover) : purement scientifique, jamais un zonage officiel tant qu'un agent ANDF ne l'a pas confirme."
    >
      <template #icone><Sprout :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="parcellesAValider.length === 0" class="text-sm text-texte-attenue">Aucune parcelle en attente de confirmation.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Parcelle</th>
            <th class="px-4 py-3 font-semibold">Usage du sol</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <tr v-for="p in parcellesAValider" :key="p.id" class="align-top">
            <td class="px-4 py-3">
              <p class="font-medium text-texte">{{ p.nup }} — {{ p.commune }}</p>
              <p class="text-xs text-texte-attenue">
                Indicatif satellite : {{ p.usageSolIndicatif ? LIBELLE_TYPE_USAGE_SOL[p.usageSolIndicatif as keyof typeof LIBELLE_TYPE_USAGE_SOL] : "—" }}
              </p>
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <select v-model="choix[p.id]" class="rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte">
                  <option v-for="(libelle, valeur) in LIBELLE_TYPE_USAGE_SOL" :key="valeur" :value="valeur">{{ libelle }}</option>
                </select>
                <BaseButton taille="sm" variant="succes" :disabled="enCoursId === p.id" @click="confirmer(p.id)">
                  <CheckCheck :size="14" aria-hidden="true" /> Confirmer
                </BaseButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
