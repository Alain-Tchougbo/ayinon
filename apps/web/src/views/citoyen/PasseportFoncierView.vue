<script setup lang="ts">
import { Lock, LockOpen, ShieldCheck } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
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

onMounted(async () => {
  definirPhraseCourante(PHRASES.bienvenue);
  await parcelles.chargerToutes();
});

const mesParcelles = computed(() => parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId));

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
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Passeport foncier"
      description="Verrouillez vos parcelles : aucune mutation ne pourra etre instruite sans votre consentement explicite (code de confirmation)."
    >
      <template #icone><ShieldCheck :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <ul class="space-y-3">
      <li v-for="parcelle in mesParcelles" :key="parcelle.id">
        <BaseCard>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-semibold text-texte">{{ parcelle.nup }}</p>
              <p class="text-sm text-texte-attenue">{{ parcelle.commune }} — {{ parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              :class="parcelle.verrouAntiVente ? 'bg-succes/10 text-succes' : 'bg-accent/10 text-accent'"
            >
              <Lock v-if="parcelle.verrouAntiVente" :size="13" aria-hidden="true" />
              <LockOpen v-else :size="13" aria-hidden="true" />
              {{ parcelle.verrouAntiVente ? "Verrouillee" : "Non verrouillee" }}
            </span>
          </div>

          <div v-if="parcelleActive === parcelle.id" class="mt-4 flex flex-wrap items-end gap-2.5">
            <div class="w-40">
              <BaseInput id="code-otp" v-model="codeOtp" label="Code a 6 chiffres" :maxlength="6" placeholder="000000" />
            </div>
            <BaseButton taille="sm" :disabled="enCours || codeOtp.length !== 6" @click="basculerVerrou(parcelle.id, parcelle.verrouAntiVente)">
              Confirmer
            </BaseButton>
            <span v-if="codeOtpDemande" class="text-xs text-texte-attenue">(demo : code = {{ codeOtpDemande }})</span>
          </div>
          <BaseButton v-else taille="sm" variant="secondaire" class="mt-4" @click="demanderOtp(parcelle.id)">
            {{ parcelle.verrouAntiVente ? "Deverrouiller" : "Verrouiller" }} cette parcelle
          </BaseButton>
          <p v-if="parcelleActive === parcelle.id && message" class="mt-2 text-xs text-texte-attenue">{{ message }}</p>
        </BaseCard>
      </li>
      <li v-if="mesParcelles.length === 0" class="text-sm text-texte-attenue">
        Aucune parcelle associee a votre compte pour le moment.
      </li>
    </ul>
  </div>
</template>
