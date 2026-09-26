<script setup lang="ts">
import { BadgeCheck, Check, X } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface DemandePro {
  id: string;
  email: string;
  nomComplet: string;
  telephone: string | null;
  role: string;
  numeroAgrement: string | null;
  createdAt: string;
}

const { definirPhraseCourante } = useVoiceAssistant();
const demandesPro = ref<DemandePro[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const actionEnCours = ref(false);
const traitementProEnCours = ref<string | null>(null);
const motifRejetPro = ref("");

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    demandesPro.value = await api.get<DemandePro[]>("/admin/demandes-professionnelles");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminDemandesProIntro);
  charger();
});

async function traiterDemandePro(id: string, approuver: boolean) {
  erreur.value = null;
  message.value = null;
  const motifRejet = motifRejetPro.value.trim();
  if (!approuver && motifRejet.length < 10) {
    erreur.value = "Le motif de rejet doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/admin/demandes-professionnelles/${id}`, { approuver, motifRejet: approuver ? undefined : motifRejet });
    message.value = approuver ? "Compte professionnel approuve." : "Demande rejetee.";
    traitementProEnCours.value = null;
    motifRejetPro.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Traitement impossible";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader titre="Demandes professionnelles" description="File d'attente des demandes de compte professionnel (geometre, notaire, agent banque).">
      <template #icone><BadgeCheck :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="demandesPro.length === 0" class="text-sm text-texte-attenue">Aucune demande en attente.</p>

    <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Demandeur</th>
            <th class="px-4 py-3 font-semibold">Agrement</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="d in demandesPro" :key="d.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="flex items-center gap-1.5 font-medium text-texte">
                  <BadgeCheck :size="13" aria-hidden="true" />
                  {{ d.nomComplet }} — {{ d.role.replaceAll("_", " ") }}
                </p>
                <p class="mt-0.5 text-xs text-texte-attenue">{{ d.email }}<span v-if="d.telephone"> — {{ d.telephone }}</span></p>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-texte">{{ d.numeroAgrement ?? "non renseigne" }}</p>
                <p class="mt-0.5 text-xs text-texte-attenue">Demande deposee le {{ new Date(d.createdAt).toLocaleDateString("fr-FR") }}</p>
              </td>
              <td class="px-4 py-3">
                <BaseButton v-if="traitementProEnCours !== d.id" taille="sm" @click="traitementProEnCours = d.id">Traiter</BaseButton>
              </td>
            </tr>
            <tr v-if="traitementProEnCours === d.id">
              <td colspan="3" class="bg-fond/40 px-4 py-3">
                <div class="space-y-2 rounded-carte border border-bordure bg-fond p-3">
                  <label :for="`motif-rejet-pro-${d.id}`" class="block text-xs font-medium text-texte">Motif du rejet (obligatoire pour rejeter)</label>
                  <textarea
                    :id="`motif-rejet-pro-${d.id}`"
                    v-model="motifRejetPro"
                    rows="2"
                    placeholder="Ex. numero d'agrement introuvable au registre professionnel"
                    class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                  />
                  <div class="flex gap-2">
                    <BaseButton taille="sm" :disabled="actionEnCours" @click="traiterDemandePro(d.id, true)">
                      <Check :size="12" aria-hidden="true" />
                      Approuver
                    </BaseButton>
                    <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="traiterDemandePro(d.id, false)">
                      <X :size="12" aria-hidden="true" />
                      Rejeter
                    </BaseButton>
                    <BaseButton taille="sm" variant="secondaire" @click="traitementProEnCours = null">Annuler</BaseButton>
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
