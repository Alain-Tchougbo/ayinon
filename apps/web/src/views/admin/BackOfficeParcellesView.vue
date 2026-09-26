<script setup lang="ts">
import { History, MapPin, Pencil } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface ParcelleAdmin {
  id: string;
  nup: string;
  commune: string;
  arrondissement: string | null;
  statut: string;
  superficieM2: number;
  proprietaire: { nomComplet: string } | null;
}
interface EntreeAudit {
  id: string;
  sequence: number;
  typeOperation: string;
  roleActeur: string | null;
  payload: Record<string, unknown>;
  hashBloc: string;
  horodatage: string;
}

const { definirPhraseCourante } = useVoiceAssistant();
const parcelles = ref<ParcelleAdmin[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const editionEnCours = ref<string | null>(null);
const communeEdition = ref("");
const arrondissementEdition = ref("");

// ET.3 : journal d'audit horodate et signe, dossier par dossier (une parcelle = un dossier).
const historiqueEnCours = ref<string | null>(null);
const historique = ref<EntreeAudit[] | null>(null);
const chargementHistorique = ref(false);

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    parcelles.value = await api.get<ParcelleAdmin[]>("/admin/parcelles");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminParcellesIntro);
  charger();
});

function ouvrirEdition(parcelle: ParcelleAdmin) {
  editionEnCours.value = parcelle.id;
  communeEdition.value = parcelle.commune;
  arrondissementEdition.value = parcelle.arrondissement ?? "";
}

async function enregistrerEdition(id: string) {
  erreur.value = null;
  message.value = null;
  try {
    await api.patch(`/admin/parcelles/${id}`, { commune: communeEdition.value, arrondissement: arrondissementEdition.value || null });
    message.value = "Parcelle mise a jour.";
    editionEnCours.value = null;
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Mise a jour impossible";
  }
}

/** ET.3 : journal d'audit d'un dossier (une parcelle), horodate et signe, identite de l'auteur
 * de chaque action. Meme endpoint que le dossier de preuves CSAF (voir GelCsafView.vue). */
async function voirHistorique(parcelleId: string) {
  if (historiqueEnCours.value === parcelleId) {
    historiqueEnCours.value = null;
    return;
  }
  historiqueEnCours.value = parcelleId;
  chargementHistorique.value = true;
  try {
    historique.value = await api.get<EntreeAudit[]>(`/audit/parcelles/${parcelleId}/historique`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger le journal d'audit";
  } finally {
    chargementHistorique.value = false;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader titre="Parcelles" description="Corrigez les champs declaratifs (commune, arrondissement) et consultez le journal d'audit d'un dossier.">
      <template #icone><MapPin :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <div v-if="!chargement" class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full table-fixed text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Parcelle</th>
            <th class="px-4 py-3 font-semibold">Proprietaire</th>
            <th class="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="p in parcelles" :key="p.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="font-medium text-texte">{{ p.nup }} — {{ p.commune }}<span v-if="p.arrondissement"> ({{ p.arrondissement }})</span></p>
              </td>
              <td class="px-4 py-3">
                <p class="text-texte">{{ p.proprietaire?.nomComplet ?? "Sans proprietaire" }}</p>
                <p class="text-xs text-texte-attenue">{{ p.superficieM2.toLocaleString("fr-FR") }} m² — {{ p.statut.replaceAll("_", " ") }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <BaseButton taille="sm" variant="secondaire" @click="ouvrirEdition(p)">
                    <Pencil :size="13" aria-hidden="true" />
                    Modifier
                  </BaseButton>
                  <BaseButton taille="sm" variant="secondaire" @click="voirHistorique(p.id)">
                    <History :size="13" aria-hidden="true" />
                    {{ historiqueEnCours === p.id ? "Masquer le journal" : "Journal d'audit" }}
                  </BaseButton>
                </div>
              </td>
            </tr>
            <!-- ET.3 : journal d'audit horodate et signe du dossier (cette parcelle). -->
            <tr v-if="historiqueEnCours === p.id">
              <td colspan="3" class="bg-fond/40 px-4 py-3">
                <p v-if="chargementHistorique" class="text-sm text-texte-attenue" role="status">Chargement du journal d'audit…</p>
                <p v-else-if="historique && historique.length === 0" class="text-sm text-texte-attenue">Aucune operation enregistree sur ce dossier.</p>
                <ol v-else-if="historique" class="space-y-2 border-l-2 border-bordure pl-4">
                  <li v-for="entree in historique" :key="entree.id" class="text-sm">
                    <p class="font-medium text-texte">{{ entree.typeOperation.replaceAll("_", " ") }}</p>
                    <p class="text-xs text-texte-attenue">
                      {{ new Date(entree.horodatage).toLocaleString("fr-FR") }}
                      <template v-if="entree.roleActeur"> — {{ entree.roleActeur.replaceAll("_", " ") }}</template>
                    </p>
                    <p class="mt-0.5 font-mono text-[0.65rem] text-texte-attenue">hash bloc : {{ entree.hashBloc.slice(0, 24) }}…</p>
                  </li>
                </ol>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <BaseModal :model-value="editionEnCours !== null" titre="Modifier la parcelle" @update:model-value="editionEnCours = null">
      <div class="flex flex-wrap items-end gap-2">
        <div class="w-48"><BaseInput id="commune-edition" v-model="communeEdition" label="Commune" /></div>
        <div class="w-48"><BaseInput id="arrondissement-edition" v-model="arrondissementEdition" label="Arrondissement" /></div>
        <div class="flex gap-2">
          <BaseButton taille="sm" @click="enregistrerEdition(editionEnCours!)">Enregistrer</BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="editionEnCours = null">Annuler</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
