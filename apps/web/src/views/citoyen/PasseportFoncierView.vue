<script setup lang="ts">
import { Lock, LockOpen, Scale, ScrollText, ShieldCheck, Users } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

const auth = useAuthStore();
const parcelles = useParcellesStore();
const { definirPhraseCourante, lire } = useVoiceAssistant();

const codeOtp = ref("");
const codeOtpDemande = ref<string | null>(null);
const parcelleActive = ref<string | null>(null);
const message = ref<string | null>(null);
const erreur = ref<string | null>(null);
const enCours = ref(false);

interface EvenementJudiciairePublic {
  statut: string;
  dateGel: string;
  dateLevee: string | null;
  motifLevee: string | null;
}
interface MutationProprietePublique {
  vendeurNom: string;
  acquereurNom: string;
  date: string;
}
interface HistoriqueParcellePublic {
  statutJudiciaire: "AUCUN_LITIGE" | "GEL_EN_COURS" | "ANTECEDENT_LEVE";
  evenementsJudiciaires: EvenementJudiciairePublic[];
  proprietairesSuccessifs: MutationProprietePublique[];
}

// Meme historique public (judiciaire + proprietaires successifs) que celui deja affiche a un
// acheteur potentiel sur la fiche d'annonce (voir AnnonceDetailView.vue) : un proprietaire a au
// moins autant de raison de consulter l'historique de son propre bien.
const parcelleHistorique = ref<string | null>(null);
const historique = ref<HistoriqueParcellePublic | null>(null);
const chargementHistorique = ref(false);

async function voirHistorique(parcelleId: string) {
  parcelleHistorique.value = parcelleId;
  historique.value = null;
  chargementHistorique.value = true;
  try {
    historique.value = await api.get<HistoriqueParcellePublic>(`/parcelles/${parcelleId}/historique`);
  } finally {
    chargementHistorique.value = false;
  }
}

onMounted(async () => {
  definirPhraseCourante(PHRASES.passeportIntro);
  await parcelles.chargerToutes();
});

const mesParcelles = computed(() => parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId));
const parcelleActiveObjet = computed(() => mesParcelles.value.find((p) => p.id === parcelleActive.value) ?? null);

function fermerModal() {
  parcelleActive.value = null;
  codeOtp.value = "";
  codeOtpDemande.value = null;
  message.value = null;
}

async function demanderOtp(parcelleId: string) {
  erreur.value = null;
  message.value = null;
  parcelleActive.value = parcelleId;
  try {
    const reponse = await api.post<{ message: string; codeDebug?: string }>("/parcelles/otp-verrou");
    message.value = reponse.message;
    codeOtpDemande.value = reponse.codeDebug ?? null;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer le code";
  }
}

async function basculerVerrou(parcelleId: string, verrouActuel: boolean) {
  enCours.value = true;
  erreur.value = null;
  try {
    await api.post("/parcelles/verrou", { parcelleId, verrouille: !verrouActuel, codeOtp: codeOtp.value });
    await parcelles.chargerToutes();
    codeOtp.value = "";
    codeOtpDemande.value = null;
    parcelleActive.value = null;
    if (!verrouActuel) await lire(PHRASES.verrouActive);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Operation impossible";
  } finally {
    enCours.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Passeport foncier"
      description="Verrouillez vos parcelles : aucune mutation ne pourra etre instruite sans votre consentement explicite (code de confirmation)."
    >
      <template #icone><ShieldCheck :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <p v-if="mesParcelles.length === 0" class="text-sm text-texte-attenue">Aucune parcelle associee a votre compte pour le moment.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Parcelle</th>
            <th class="px-4 py-3 font-semibold">Statut</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="parcelle in mesParcelles" :key="parcelle.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="font-semibold text-texte">{{ parcelle.nup }}</p>
                <p class="text-xs text-texte-attenue">{{ parcelle.commune }} - {{ parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  :class="parcelle.verrouAntiVente ? 'bg-succes/10 text-succes' : 'bg-accent/10 text-accent'"
                >
                  <Lock v-if="parcelle.verrouAntiVente" :size="13" aria-hidden="true" />
                  <LockOpen v-else :size="13" aria-hidden="true" />
                  {{ parcelle.verrouAntiVente ? "Verrouillee" : "Non verrouillee" }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <BaseButton taille="sm" :variant="parcelle.verrouAntiVente ? 'danger' : 'secondaire'" @click="demanderOtp(parcelle.id)">
                    {{ parcelle.verrouAntiVente ? "Deverrouiller" : "Verrouiller" }}
                  </BaseButton>
                  <BaseButton taille="sm" variant="secondaire" @click="voirHistorique(parcelle.id)">
                    <ScrollText :size="14" aria-hidden="true" />
                    Historique
                  </BaseButton>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <BaseModal
      :model-value="parcelleActive !== null"
      :titre="parcelleActiveObjet?.verrouAntiVente ? 'Deverrouiller la parcelle' : 'Verrouiller la parcelle'"
      @update:model-value="fermerModal"
    >
      <div v-if="parcelleActiveObjet" class="space-y-3">
        <p class="text-sm text-texte-attenue">{{ parcelleActiveObjet.nup }} - {{ parcelleActiveObjet.commune }}</p>
        <BaseInput id="code-otp" v-model="codeOtp" label="Code a 6 chiffres" :maxlength="6" placeholder="000000" />
        <p v-if="codeOtpDemande" class="text-xs text-texte-attenue">(demo : code = {{ codeOtpDemande }})</p>
        <p v-if="message" class="text-xs text-texte-attenue" role="status">{{ message }}</p>
        <div class="flex gap-2">
          <BaseButton
            taille="sm"
            :variant="parcelleActiveObjet.verrouAntiVente ? 'danger' : 'primaire'"
            :disabled="enCours || codeOtp.length !== 6"
            @click="basculerVerrou(parcelleActiveObjet.id, parcelleActiveObjet.verrouAntiVente)"
          >
            Confirmer
          </BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="fermerModal">Annuler</BaseButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      :model-value="parcelleHistorique !== null"
      titre="Historique de la parcelle"
      @update:model-value="parcelleHistorique = null; historique = null"
    >
      <p v-if="chargementHistorique" class="text-sm text-texte-attenue" role="status">Chargement...</p>
      <div v-else-if="historique" class="space-y-4">
        <div>
          <p class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <Scale :size="14" aria-hidden="true" /> Situation judiciaire
          </p>
          <p v-if="historique.statutJudiciaire === 'AUCUN_LITIGE'" class="rounded-carte bg-succes/10 px-3 py-2 text-sm text-succes">
            Aucun litige ni gel judiciaire connu sur cette parcelle
          </p>
          <template v-else>
            <p v-if="historique.statutJudiciaire === 'GEL_EN_COURS'" class="rounded-carte bg-danger/10 px-3 py-2 text-sm text-danger">
              Gel conservatoire en cours - mutation bloquee
            </p>
            <p v-else class="rounded-carte bg-accent/10 px-3 py-2 text-sm text-accent">Litige anterieur, aujourd'hui leve</p>
            <ul class="mt-2 space-y-1.5 text-sm text-texte">
              <li v-for="(evenement, i) in historique.evenementsJudiciaires" :key="i">
                <template v-if="evenement.statut === 'ACTIF'">Gel ouvert le {{ new Date(evenement.dateGel).toLocaleDateString("fr-FR") }}, procedure en cours.</template>
                <template v-else>
                  Gel du {{ new Date(evenement.dateGel).toLocaleDateString("fr-FR") }} leve le {{ new Date(evenement.dateLevee!).toLocaleDateString("fr-FR") }}<template v-if="evenement.motifLevee"> - {{ evenement.motifLevee }}</template>.
                </template>
              </li>
            </ul>
          </template>
        </div>
        <div>
          <p class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <Users :size="14" aria-hidden="true" /> Proprietaires successifs
          </p>
          <p v-if="!historique.proprietairesSuccessifs.length" class="text-sm text-texte-attenue">Aucune mutation avant le proprietaire actuel.</p>
          <ol v-else class="space-y-1 text-sm text-texte">
            <li v-for="(mutation, i) in historique.proprietairesSuccessifs" :key="i" class="flex items-center justify-between">
              <span>{{ mutation.vendeurNom }} → {{ mutation.acquereurNom }}</span>
              <span class="text-xs text-texte-attenue">{{ new Date(mutation.date).toLocaleDateString("fr-FR") }}</span>
            </li>
          </ol>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
