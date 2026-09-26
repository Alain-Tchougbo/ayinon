<script setup lang="ts">
import { CheckCheck, Sprout } from "@lucide/vue";
import { LIBELLE_TYPE_USAGE_SOL, TypeUsageSol } from "@ayinon/shared";
import { onMounted, reactive, ref } from "vue";
import { ApiError, api } from "../../services/api";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
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
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Validation de l'occupation du sol"
      description="L'usage du sol indicatif est derive d'un calque satellite (type ESA WorldCover) : purement scientifique, jamais un zonage officiel tant qu'un agent ANDF ne l'a pas confirme."
    >
      <template #icone><Sprout :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="parcellesAValider.length === 0" class="text-sm text-texte-attenue">Aucune parcelle en attente de confirmation.</p>
      <ul v-else class="space-y-3">
        <li v-for="p in parcellesAValider" :key="p.id" class="rounded-carte border border-bordure bg-surface p-3.5 text-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-medium text-texte">{{ p.nup }} — {{ p.commune }}</p>
              <p class="text-xs text-texte-attenue">
                Indicatif satellite : {{ p.usageSolIndicatif ? LIBELLE_TYPE_USAGE_SOL[p.usageSolIndicatif as keyof typeof LIBELLE_TYPE_USAGE_SOL] : "—" }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <select v-model="choix[p.id]" class="rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte">
                <option v-for="(libelle, valeur) in LIBELLE_TYPE_USAGE_SOL" :key="valeur" :value="valeur">{{ libelle }}</option>
              </select>
              <BaseButton taille="sm" variant="succes" :disabled="enCoursId === p.id" @click="confirmer(p.id)">
                <CheckCheck :size="14" aria-hidden="true" /> Confirmer
              </BaseButton>
            </div>
          </div>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>
