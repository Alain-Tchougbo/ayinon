<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface AnnonceARisque {
  id: string;
  prixIndicatifFcfa: number;
  prixParM2: number;
  moyenneCommuneFcfaParM2: number;
  deviationPourcentage: number;
  createdAt: string;
  parcelle: { nup: string; commune: string };
  publieePar: { nomComplet: string };
}

const { definirPhraseCourante } = useVoiceAssistant();
const annoncesARisque = ref<AnnonceARisque[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const actionEnCours = ref(false);
const suspensionEnCours = ref<string | null>(null);
const motifSuspension = ref("");

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    annoncesARisque.value = await api.get<AnnonceARisque[]>("/admin/annonces-a-risque");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminAnnoncesRisqueIntro);
  charger();
});

/** E1.14 : suspension de moderation, distincte du retrait par le vendeur ou de la verification ANDF. */
async function suspendreAnnonce(id: string) {
  erreur.value = null;
  message.value = null;
  const motif = motifSuspension.value.trim();
  if (motif.length < 10) {
    erreur.value = "Le motif de suspension doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/admin/annonces/${id}/suspendre`, { motif });
    message.value = "Annonce suspendue.";
    suspensionEnCours.value = null;
    motifSuspension.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Suspension impossible";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Annonces a risque"
      description="Detection automatique des annonces dont le prix devie significativement de la moyenne communale reelle."
    >
      <template #icone><TriangleAlert :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="annoncesARisque.length === 0" class="text-sm text-texte-attenue">
      Aucune annonce active ne devie significativement de la moyenne communale.
    </p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Annonce</th>
            <th class="px-4 py-3 font-semibold">Ecart de prix</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="a in annoncesARisque" :key="a.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="flex items-center gap-1.5 font-medium text-texte">
                  <TriangleAlert :size="13" class="text-danger" aria-hidden="true" />
                  {{ a.parcelle.nup }} - {{ a.parcelle.commune }}
                </p>
                <p class="mt-0.5 text-xs text-texte-attenue">Publiee par {{ a.publieePar.nomComplet }} le {{ new Date(a.createdAt).toLocaleDateString("fr-FR") }}</p>
              </td>
              <td class="px-4 py-3 text-sm text-texte">
                {{ a.prixParM2.toLocaleString("fr-FR") }} FCFA/m² -
                {{ a.deviationPourcentage > 0 ? "+" : "" }}{{ a.deviationPourcentage }}% par rapport a la moyenne communale
                ({{ a.moyenneCommuneFcfaParM2.toLocaleString("fr-FR") }} FCFA/m²)
              </td>
              <td class="px-4 py-3">
                <BaseButton taille="sm" variant="secondaire" @click="suspensionEnCours = a.id">
                  Mettre en revue
                </BaseButton>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <BaseModal :model-value="suspensionEnCours !== null" titre="Suspendre l'annonce" @update:model-value="suspensionEnCours = null">
      <div class="space-y-2">
        <label for="motif-suspension" class="block text-xs font-medium text-texte">Motif de la suspension (obligatoire)</label>
        <textarea
          id="motif-suspension"
          v-model="motifSuspension"
          rows="3"
          placeholder="Ex. prix trois fois superieur a la moyenne communale constatee, sans justification apparente"
          class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-xs text-texte"
        />
        <div class="flex gap-2">
          <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="suspendreAnnonce(suspensionEnCours!)">Suspendre l'annonce</BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="suspensionEnCours = null">Annuler</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
