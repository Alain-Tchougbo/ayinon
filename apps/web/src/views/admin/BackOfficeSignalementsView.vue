<script setup lang="ts">
import { Check, Flag, X } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface Signalement {
  id: string;
  type: "ANNONCE" | "LITIGE_FONCIER";
  statut: "DEPOSE" | "FONDE" | "REJETE";
  motif: string;
  descriptif: string | null;
  decisionMotif: string | null;
  createdAt: string;
  parcelle: { nup: string; commune: string };
  annonce: { id: string; statut: string } | null;
  signalant: { nomComplet: string; role: string };
}

const { definirPhraseCourante } = useVoiceAssistant();
const signalements = ref<Signalement[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const actionEnCours = ref(false);
const qualificationEnCours = ref<string | null>(null);
const motifQualification = ref("");

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    signalements.value = await api.get<Signalement[]>("/signalements");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminSignalementsIntro);
  charger();
});

async function qualifier(id: string, fonde: boolean) {
  erreur.value = null;
  message.value = null;
  const motif = motifQualification.value.trim();
  if (motif.length < 10) {
    erreur.value = "Le motif de decision doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/signalements/${id}/qualifier`, { fonde, motif });
    message.value = fonde ? "Signalement retenu comme fonde." : "Signalement rejete.";
    qualificationEnCours.value = null;
    motifQualification.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Qualification impossible";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader titre="Signalements" description="Qualifiez les signalements deposes par les utilisateurs (annonce suspecte ou litige foncier).">
      <template #icone><Flag :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="signalements.length === 0" class="text-sm text-texte-attenue">Aucun signalement pour le moment.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Signalement</th>
            <th class="px-4 py-3 font-semibold">Statut</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="s in signalements" :key="s.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="flex items-center gap-1.5 font-medium text-texte">
                  <Flag :size="13" aria-hidden="true" />
                  {{ s.type === "ANNONCE" ? "Probleme sur une annonce" : "Litige foncier" }} — {{ s.parcelle.nup }} ({{ s.parcelle.commune }})
                </p>
                <p class="mt-0.5 text-xs text-texte-attenue">Signale par {{ s.signalant.nomComplet }} ({{ s.signalant.role.replaceAll("_", " ") }})</p>
                <p class="mt-1.5 text-sm text-texte">{{ s.motif }}</p>
                <p v-if="s.descriptif" class="mt-1 text-xs text-texte-attenue">{{ s.descriptif }}</p>
                <p v-if="s.decisionMotif" class="mt-1.5 text-xs italic text-texte-attenue">Decision : {{ s.decisionMotif }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="s.statut === 'FONDE' ? 'bg-danger/10 text-danger' : s.statut === 'REJETE' ? 'bg-texte-attenue/10 text-texte-attenue' : 'bg-accent/10 text-accent'"
                >
                  {{ s.statut === "DEPOSE" ? "A qualifier" : s.statut === "FONDE" ? "Fonde" : "Rejete" }}
                </span>
              </td>
              <td class="px-4 py-3">
                <BaseButton v-if="s.statut === 'DEPOSE' && qualificationEnCours !== s.id" taille="sm" @click="qualificationEnCours = s.id">
                  Qualifier
                </BaseButton>
              </td>
            </tr>
            <tr v-if="s.statut === 'DEPOSE' && qualificationEnCours === s.id">
              <td colspan="3" class="bg-fond/40 px-4 py-3">
                <div class="space-y-2 rounded-carte border border-bordure bg-fond p-3">
                  <label :for="`motif-qualif-${s.id}`" class="block text-xs font-medium text-texte">Motif de la decision (obligatoire)</label>
                  <textarea
                    :id="`motif-qualif-${s.id}`"
                    v-model="motifQualification"
                    rows="2"
                    class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                  />
                  <div class="flex gap-2">
                    <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="qualifier(s.id, true)">
                      <Check :size="12" aria-hidden="true" />
                      Retenir comme fonde
                    </BaseButton>
                    <BaseButton taille="sm" variant="secondaire" :disabled="actionEnCours" @click="qualifier(s.id, false)">
                      <X :size="12" aria-hidden="true" />
                      Rejeter
                    </BaseButton>
                    <BaseButton taille="sm" variant="ghost" @click="qualificationEnCours = null">Annuler</BaseButton>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
