<script setup lang="ts">
import { Gavel, Lock, Search, Unlock } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ConflitCsaf {
  id: string;
  motif: string;
  referenceDossierJudiciaire: string;
  dateGel: string;
  parcelle: { nup: string; commune: string; poleTerritorial: string };
}

const parcelles = useParcellesStore();
const { definirPhraseCourante } = useVoiceAssistant();
const conflitsActifs = ref<ConflitCsaf[]>([]);

const nupRecherche = ref("");
const parcelleCible = ref<{ id: string; nup: string; statut: string } | null>(null);
const motif = ref("");
const referenceDossierJudiciaire = ref("");
const message = ref<string | null>(null);
const erreur = ref<string | null>(null);
const confirmationRequise = ref(false);

// Levee de gel : meme exigence de motif + confirmation explicite que la pose du gel, pour un acte
// judiciaire tout aussi lourd (voir audit : la levee etait auparavant un simple clic sans motif).
const conflitEnLevee = ref<string | null>(null);
const motifLeveeParConflit = ref<Record<string, string>>({});

onMounted(() => {
  definirPhraseCourante(PHRASES.csafIntro);
  chargerConflits();
});

async function chargerConflits() {
  conflitsActifs.value = await api.get<ConflitCsaf[]>("/csaf/conflits-actifs");
}

async function chercherParcelle() {
  erreur.value = null;
  const resultats = await parcelles.rechercher({ nup: nupRecherche.value });
  parcelleCible.value = resultats[0] ?? null;
  if (!parcelleCible.value) erreur.value = "Aucune parcelle trouvee";
}

async function confirmerGel() {
  if (!parcelleCible.value) return;
  erreur.value = null;
  message.value = null;
  try {
    await api.post("/csaf/gel", {
      parcelleId: parcelleCible.value.id,
      motif: motif.value,
      referenceDossierJudiciaire: referenceDossierJudiciaire.value,
    });
    message.value = `Parcelle ${parcelleCible.value.nup} placee sous gel conservatoire. Statut ROUGE applique nationalement.`;
    confirmationRequise.value = false;
    parcelleCible.value = null;
    motif.value = "";
    referenceDossierJudiciaire.value = "";
    await chargerConflits();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Gel impossible";
  }
}

async function confirmerLevee(conflitId: string) {
  erreur.value = null;
  message.value = null;
  const motifLevee = motifLeveeParConflit.value[conflitId]?.trim() ?? "";
  if (motifLevee.length < 10) {
    erreur.value = "Le motif de levee doit compter au moins 10 caracteres";
    return;
  }
  try {
    await api.post("/csaf/levee", { conflitId, motifLevee });
    message.value = "Gel conservatoire leve.";
    conflitEnLevee.value = null;
    delete motifLeveeParConflit.value[conflitId];
    await chargerConflits();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Levee impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Bouton de gel conservatoire judiciaire"
      description="En un clic, place une parcelle contestee sous sequestre : statut ROUGE immediat sur tout le territoire, blocage de toute vente."
    >
      <template #icone><Gavel :size="22" class="text-danger" aria-hidden="true" /></template>
    </PageHeader>

    <form class="flex gap-2" @submit.prevent="chercherParcelle">
      <div class="relative flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="nupRecherche"
          placeholder="NUP de la parcelle a geler"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <BaseButton type="submit" variant="secondaire">Rechercher</BaseButton>
    </form>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <BaseCard v-if="parcelleCible" accentue="danger">
      <p class="font-semibold text-texte">Parcelle : {{ parcelleCible.nup }} — statut actuel : {{ parcelleCible.statut }}</p>
      <div class="mt-3 space-y-2.5">
        <BaseInput id="dossier-judiciaire" v-model="referenceDossierJudiciaire" label="Reference du dossier judiciaire" />
        <div>
          <label for="motif-gel" class="mb-1 block text-sm font-medium text-texte">Motif du gel</label>
          <textarea
            id="motif-gel"
            v-model="motif"
            rows="2"
            placeholder="Ex. double vente alleguee"
            class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte"
          />
        </div>
      </div>

      <BaseButton
        v-if="!confirmationRequise"
        variant="danger"
        class="mt-3.5"
        :disabled="!motif || !referenceDossierJudiciaire"
        @click="confirmationRequise = true"
      >
        <Lock :size="16" aria-hidden="true" />
        Geler cette parcelle
      </BaseButton>
      <div v-else class="mt-3.5 rounded-carte border border-danger p-3.5">
        <p class="text-sm font-semibold text-danger">Confirmez-vous le gel conservatoire de {{ parcelleCible.nup }} ?</p>
        <div class="mt-2.5 flex gap-2">
          <BaseButton variant="danger" taille="sm" @click="confirmerGel">Oui, confirmer le gel</BaseButton>
          <BaseButton variant="secondaire" taille="sm" @click="confirmationRequise = false">Annuler</BaseButton>
        </div>
      </div>
    </BaseCard>

    <div>
      <h2 class="mb-3 font-semibold text-texte">Conflits CSAF actifs ({{ conflitsActifs.length }})</h2>
      <ul class="space-y-2.5">
        <li v-for="conflit in conflitsActifs" :key="conflit.id">
          <BaseCard accentue="danger" rembourrage="sm">
            <p class="font-semibold text-texte">{{ conflit.parcelle.nup }} — {{ conflit.parcelle.commune }}</p>
            <p class="mt-0.5 text-sm text-texte-attenue">{{ conflit.motif }} (dossier {{ conflit.referenceDossierJudiciaire }})</p>
            <p class="mt-0.5 text-xs text-texte-attenue">Gele le {{ new Date(conflit.dateGel).toLocaleDateString("fr-FR") }}</p>

            <BaseButton v-if="conflitEnLevee !== conflit.id" variant="secondaire" taille="sm" class="mt-2.5" @click="conflitEnLevee = conflit.id">
              <Unlock :size="14" aria-hidden="true" />
              Lever le gel
            </BaseButton>
            <div v-else class="mt-2.5 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <div>
                <label :for="`motif-levee-${conflit.id}`" class="mb-1 block text-xs font-medium text-texte">
                  Motif de la levee (obligatoire)
                </label>
                <textarea
                  :id="`motif-levee-${conflit.id}`"
                  v-model="motifLeveeParConflit[conflit.id]"
                  rows="2"
                  placeholder="Ex. litige resolu par jugement du..."
                  class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                />
              </div>
              <p class="text-xs text-texte-attenue">Confirmez-vous la levee du gel sur {{ conflit.parcelle.nup }} ?</p>
              <div class="flex gap-2">
                <BaseButton taille="sm" @click="confirmerLevee(conflit.id)">Oui, lever le gel</BaseButton>
                <BaseButton variant="secondaire" taille="sm" @click="conflitEnLevee = null">Annuler</BaseButton>
              </div>
            </div>
          </BaseCard>
        </li>
        <li v-if="conflitsActifs.length === 0" class="text-sm text-texte-attenue">Aucun conflit actif.</li>
      </ul>
    </div>
  </div>
</template>
