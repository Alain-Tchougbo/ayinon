<script setup lang="ts">
import { Banknote, CircleCheck, CircleX, Landmark, Search, TriangleAlert } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ResultatSolvabilite {
  parcelle: { id: string; nup: string; commune: string; statut: string; superficieM2: number };
  possedeTitre: boolean;
  geleeCsaf: boolean;
  libreDeGage: boolean;
  eligibleCredit: boolean;
  hypothequesActives: Array<{ id: string; banqueNom: string; montantGarantiFcfa: number }>;
}
interface Hypotheque {
  id: string;
  banqueNom: string;
  montantGarantiFcfa: number;
  statut: "ACTIVE" | "LEVEE";
  dateInscription: string;
  parcelle: { nup: string; commune: string };
}
interface DepotAConfirmer {
  id: string;
  montantFcfa: number;
  dateDeclaration: string;
  convention: { montantFcfa: number; vendeurNom: string; acquereurNom: string; parcelle: { nup: string; commune: string } };
  declarePar: { nomComplet: string };
}

const { definirPhraseCourante } = useVoiceAssistant();

const nup = ref("");
const resultat = ref<ResultatSolvabilite | null>(null);
const chargementRecherche = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const inscriptionOuverte = ref(false);
const banqueNom = ref("");
const montantGaranti = ref("");
const enCours = ref(false);

const mesInscriptions = ref<Hypotheque[]>([]);
const leveeEnCoursId = ref<string | null>(null);
const motifLeveeParHypotheque = ref<Record<string, string>>({});

const depotsAConfirmer = ref<DepotAConfirmer[]>([]);
const confirmationEnCoursId = ref<string | null>(null);

onMounted(async () => {
  definirPhraseCourante(PHRASES.solvabiliteIntro);
  try {
    await Promise.all([chargerMesInscriptions(), chargerDepotsAConfirmer()]);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger vos donnees";
  }
});

async function chargerMesInscriptions() {
  mesInscriptions.value = await api.get<Hypotheque[]>("/hypotheques/mes-inscriptions");
}

async function chargerDepotsAConfirmer() {
  depotsAConfirmer.value = await api.get<DepotAConfirmer[]>("/sequestres/a-confirmer");
}

async function confirmerDepot(id: string) {
  erreur.value = null;
  message.value = null;
  confirmationEnCoursId.value = id;
  try {
    await api.patch(`/sequestres/${id}/confirmer`);
    message.value = "Depot confirme : le vendeur et l'acheteur en sont informes.";
    await chargerDepotsAConfirmer();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Confirmation impossible";
  } finally {
    confirmationEnCoursId.value = null;
  }
}

async function rechercher() {
  erreur.value = null;
  message.value = null;
  resultat.value = null;
  chargementRecherche.value = true;
  try {
    resultat.value = await api.post<ResultatSolvabilite>("/hypotheques/verifier-solvabilite", { nup: nup.value.trim() });
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Recherche impossible";
  } finally {
    chargementRecherche.value = false;
  }
}

async function inscrire() {
  if (!resultat.value) return;
  erreur.value = null;
  enCours.value = true;
  try {
    await api.post("/hypotheques", {
      parcelleId: resultat.value.parcelle.id,
      banqueNom: banqueNom.value,
      montantGarantiFcfa: montantGaranti.value,
    });
    message.value = `Hypotheque inscrite sur ${resultat.value.parcelle.nup}. Toute autre banque le verra desormais instantanement.`;
    inscriptionOuverte.value = false;
    banqueNom.value = "";
    montantGaranti.value = "";
    await Promise.all([rechercher(), chargerMesInscriptions()]);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Inscription impossible";
  } finally {
    enCours.value = false;
  }
}

async function lever(hypothequeId: string) {
  erreur.value = null;
  const motifLevee = motifLeveeParHypotheque.value[hypothequeId]?.trim();
  if (!motifLevee || motifLevee.length < 10) {
    erreur.value = "Le motif de levee doit compter au moins 10 caracteres";
    return;
  }
  try {
    await api.patch(`/hypotheques/${hypothequeId}/lever`, { motifLevee });
    message.value = "Hypotheque levee.";
    leveeEnCoursId.value = null;
    delete motifLeveeParHypotheque.value[hypothequeId];
    await chargerMesInscriptions();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Levee impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
    <PageHeader
      titre="Verification de solvabilite hypothecaire"
      description="Verifiez en un appel qu'une parcelle est titree, non gelee et libre de tout autre gage avant d'accorder un credit."
    >
      <template #icone><Landmark :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <!-- E5.5 : depots de reservation declares par des acheteurs, en attente de confirmation
         d'encaissement (suivi de statut uniquement, voir docs/decisions.md). -->
    <section v-if="depotsAConfirmer.length > 0">
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <Banknote :size="16" class="text-accent" aria-hidden="true" />
        Depots a confirmer ({{ depotsAConfirmer.length }})
      </h2>
      <ul class="space-y-2.5">
        <li v-for="d in depotsAConfirmer" :key="d.id">
          <BaseCard accentue="accent" rembourrage="sm">
            <p class="font-semibold text-texte">{{ d.convention.parcelle.nup }} — {{ d.convention.parcelle.commune }}</p>
            <p class="mt-0.5 text-sm text-texte-attenue">
              {{ d.declarePar.nomComplet }} declare {{ d.montantFcfa.toLocaleString("fr-FR") }} FCFA le
              {{ new Date(d.dateDeclaration).toLocaleDateString("fr-FR") }}
            </p>
            <BaseButton taille="sm" class="mt-2.5" :disabled="confirmationEnCoursId === d.id" @click="confirmerDepot(d.id)">
              Confirmer l'encaissement
            </BaseButton>
          </BaseCard>
        </li>
      </ul>
    </section>

    <form class="flex gap-2" @submit.prevent="rechercher">
      <div class="relative flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="nup"
          placeholder="NUP de la parcelle (ex. BJ-LIT-COT-0001)"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <BaseButton type="submit" :disabled="chargementRecherche || !nup.trim()">Verifier</BaseButton>
    </form>

    <BaseCard v-if="resultat" :accentue="resultat.eligibleCredit ? 'succes' : 'danger'">
      <p class="font-semibold text-texte">{{ resultat.parcelle.nup }} — {{ resultat.parcelle.commune }}</p>
      <p class="text-xs text-texte-attenue">{{ resultat.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>

      <ul class="mt-3.5 space-y-1.5 border-t border-bordure pt-3 text-sm">
        <li class="flex items-center gap-2" :class="resultat.possedeTitre ? 'text-succes' : 'text-danger'">
          <CircleCheck v-if="resultat.possedeTitre" :size="16" aria-hidden="true" />
          <CircleX v-else :size="16" aria-hidden="true" />
          {{ resultat.possedeTitre ? "Titre foncier delivre" : "Aucun titre foncier delivre" }}
        </li>
        <li class="flex items-center gap-2" :class="!resultat.geleeCsaf ? 'text-succes' : 'text-danger'">
          <CircleCheck v-if="!resultat.geleeCsaf" :size="16" aria-hidden="true" />
          <TriangleAlert v-else :size="16" aria-hidden="true" />
          {{ resultat.geleeCsaf ? "Sous gel conservatoire judiciaire (CSAF)" : "Aucun gel conservatoire" }}
        </li>
        <li class="flex items-center gap-2" :class="resultat.libreDeGage ? 'text-succes' : 'text-danger'">
          <CircleCheck v-if="resultat.libreDeGage" :size="16" aria-hidden="true" />
          <CircleX v-else :size="16" aria-hidden="true" />
          {{ resultat.libreDeGage ? "Libre de toute hypotheque" : "Deja gagee" }}
        </li>
      </ul>

      <div v-if="resultat.hypothequesActives.length > 0" class="mt-3 space-y-1.5">
        <p v-for="h in resultat.hypothequesActives" :key="h.id" class="text-xs text-danger">
          Gage actif : {{ h.banqueNom }} — {{ h.montantGarantiFcfa.toLocaleString("fr-FR") }} FCFA
        </p>
      </div>

      <p class="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold" :class="resultat.eligibleCredit ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'">
        {{ resultat.eligibleCredit ? "Eligible au credit" : "Non eligible au credit en l'etat" }}
      </p>

      <template v-if="resultat.eligibleCredit">
        <div v-if="inscriptionOuverte" class="mt-4 space-y-2.5 border-t border-bordure pt-3.5">
          <BaseInput id="banque-nom" v-model="banqueNom" label="Nom de la banque / microfinance" />
          <BaseInput id="montant-garanti" v-model="montantGaranti" type="number" label="Montant garanti (FCFA)" />
          <div class="flex gap-2">
            <BaseButton taille="sm" :disabled="enCours || !banqueNom || !montantGaranti" @click="inscrire">
              <Banknote :size="14" aria-hidden="true" />
              Inscrire l'hypotheque
            </BaseButton>
            <BaseButton taille="sm" variant="secondaire" @click="inscriptionOuverte = false">Annuler</BaseButton>
          </div>
        </div>
        <BaseButton v-else taille="sm" variant="secondaire" class="mt-4" @click="inscriptionOuverte = true">
          Inscrire une hypotheque
        </BaseButton>
      </template>
    </BaseCard>

    <section v-if="mesInscriptions.length > 0">
      <h2 class="mb-3 font-semibold text-texte">Vos hypotheques inscrites</h2>
      <ul class="space-y-2.5">
        <li v-for="h in mesInscriptions" :key="h.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-medium text-texte">{{ h.parcelle.nup }} — {{ h.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">{{ h.montantGarantiFcfa.toLocaleString("fr-FR") }} FCFA — inscrite le {{ new Date(h.dateInscription).toLocaleDateString("fr-FR") }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                :class="h.statut === 'ACTIVE' ? 'bg-accent/10 text-accent' : 'bg-succes/10 text-succes'"
              >
                {{ h.statut === "ACTIVE" ? "Active" : "Levee" }}
              </span>
            </div>

            <template v-if="h.statut === 'ACTIVE'">
              <BaseButton v-if="leveeEnCoursId !== h.id" taille="sm" variant="secondaire" class="mt-2.5" @click="leveeEnCoursId = h.id">
                Lever l'hypotheque
              </BaseButton>
              <div v-else class="mt-2.5 space-y-2 rounded-carte border border-bordure bg-fond p-3">
                <label :for="`motif-levee-${h.id}`" class="block text-xs font-medium text-texte">Motif de la levee (obligatoire)</label>
                <textarea
                  :id="`motif-levee-${h.id}`"
                  v-model="motifLeveeParHypotheque[h.id]"
                  rows="2"
                  placeholder="Ex. credit rembourse integralement"
                  class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                />
                <div class="flex gap-2">
                  <BaseButton taille="sm" @click="lever(h.id)">Confirmer la levee</BaseButton>
                  <BaseButton taille="sm" variant="secondaire" @click="leveeEnCoursId = null">Annuler</BaseButton>
                </div>
              </div>
            </template>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
