<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
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
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Annonces a risque"
      description="Detection automatique des annonces dont le prix devie significativement de la moyenne communale reelle."
    >
      <template #icone><TriangleAlert :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <ul v-if="!chargement" class="space-y-2.5">
      <li v-if="annoncesARisque.length === 0" class="text-sm text-texte-attenue">Aucune annonce active ne devie significativement de la moyenne communale.</li>
      <li v-for="a in annoncesARisque" :key="a.id">
        <BaseCard accentue="danger" rembourrage="sm">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="flex items-center gap-1.5 font-medium text-texte">
                <TriangleAlert :size="13" class="text-danger" aria-hidden="true" />
                {{ a.parcelle.nup }} — {{ a.parcelle.commune }}
              </p>
              <p class="mt-0.5 text-xs text-texte-attenue">Publiee par {{ a.publieePar.nomComplet }} le {{ new Date(a.createdAt).toLocaleDateString("fr-FR") }}</p>
              <p class="mt-1.5 text-sm text-texte">
                {{ a.prixParM2.toLocaleString("fr-FR") }} FCFA/m² —
                {{ a.deviationPourcentage > 0 ? "+" : "" }}{{ a.deviationPourcentage }}% par rapport a la moyenne communale
                ({{ a.moyenneCommuneFcfaParM2.toLocaleString("fr-FR") }} FCFA/m²)
              </p>
            </div>
          </div>

          <div v-if="suspensionEnCours === a.id" class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
            <label :for="`motif-suspension-${a.id}`" class="block text-xs font-medium text-texte">Motif de la suspension (obligatoire)</label>
            <textarea
              :id="`motif-suspension-${a.id}`"
              v-model="motifSuspension"
              rows="2"
              placeholder="Ex. prix trois fois superieur a la moyenne communale constatee, sans justification apparente"
              class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
            />
            <div class="flex gap-2">
              <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="suspendreAnnonce(a.id)">Suspendre l'annonce</BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="suspensionEnCours = null">Annuler</BaseButton>
            </div>
          </div>
          <BaseButton v-else taille="sm" variant="secondaire" class="mt-3" @click="suspensionEnCours = a.id">Mettre en revue</BaseButton>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
