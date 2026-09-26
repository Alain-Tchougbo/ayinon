<script setup lang="ts">
import { FileStack, History } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface Documents {
  conventions: Array<{
    id: string;
    vendeurNom: string;
    acquereurNom: string;
    montantFcfa: number;
    statutCession: string;
    parcelle: { id: string; nup: string };
  }>;
  titres: Array<{ id: string; numeroTitre: string; dateDelivrance: string; parcelle: { id: string; nup: string } }>;
}
interface EntreeAudit {
  id: string;
  typeOperation: string;
  roleActeur: string | null;
  hashBloc: string;
  horodatage: string;
}

const { definirPhraseCourante } = useVoiceAssistant();
const documents = ref<Documents | null>(null);
const chargement = ref(false);
const erreur = ref<string | null>(null);

// Conventions/titres restent en lecture seule (voir AdminService) : seul le journal d'audit du
// dossier (la parcelle) est consultable, jamais une reecriture du document lui-meme.
const historiqueEnCours = ref<string | null>(null);
const historique = ref<EntreeAudit[] | null>(null);
const chargementHistorique = ref(false);

onMounted(async () => {
  definirPhraseCourante(PHRASES.adminDocumentsIntro);
  chargement.value = true;
  try {
    documents.value = await api.get<Documents>("/admin/documents");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
});

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
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Documents"
      description="Registre des conventions et titres, en lecture seule : consultez le journal d'audit signe du dossier plutot que de reecrire un document juridique."
    >
      <template #icone><FileStack :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <div v-if="!chargement && documents" class="space-y-6">
      <div>
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-texte"><FileStack :size="15" aria-hidden="true" /> Conventions ({{ documents.conventions.length }})</h2>
        <ul class="space-y-2">
          <li v-for="c in documents.conventions" :key="c.id" class="rounded-carte border border-bordure bg-surface px-3.5 py-2.5 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span class="font-medium text-texte">{{ c.parcelle.nup }}</span>
                <span class="text-texte-attenue"> — {{ c.vendeurNom }} → {{ c.acquereurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA — {{ c.statutCession.replaceAll("_", " ") }}</span>
              </p>
              <BaseButton taille="sm" variant="secondaire" @click="voirHistorique(c.parcelle.id)">
                <History :size="13" aria-hidden="true" />
                {{ historiqueEnCours === c.parcelle.id ? "Masquer" : "Journal d'audit" }}
              </BaseButton>
            </div>
            <div v-if="historiqueEnCours === c.parcelle.id" class="mt-2.5 border-t border-bordure pt-2.5">
              <p v-if="chargementHistorique" class="text-xs text-texte-attenue" role="status">Chargement…</p>
              <p v-else-if="historique && historique.length === 0" class="text-xs text-texte-attenue">Aucune operation enregistree sur ce dossier.</p>
              <ol v-else-if="historique" class="space-y-1.5 border-l-2 border-bordure pl-3">
                <li v-for="entree in historique" :key="entree.id" class="text-xs">
                  <span class="font-medium text-texte">{{ entree.typeOperation.replaceAll("_", " ") }}</span>
                  <span class="text-texte-attenue"> — {{ new Date(entree.horodatage).toLocaleString("fr-FR") }}</span>
                </li>
              </ol>
            </div>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="mb-2 text-sm font-semibold text-texte">Titres delivres ({{ documents.titres.length }})</h2>
        <ul class="space-y-2">
          <li v-for="t in documents.titres" :key="t.id" class="rounded-carte border border-bordure bg-surface px-3.5 py-2.5 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span class="font-medium text-texte">{{ t.numeroTitre }}</span>
                <span class="text-texte-attenue"> — {{ t.parcelle.nup }} — delivre le {{ new Date(t.dateDelivrance).toLocaleDateString("fr-FR") }}</span>
              </p>
              <BaseButton taille="sm" variant="secondaire" @click="voirHistorique(t.parcelle.id)">
                <History :size="13" aria-hidden="true" />
                {{ historiqueEnCours === t.parcelle.id ? "Masquer" : "Journal d'audit" }}
              </BaseButton>
            </div>
            <div v-if="historiqueEnCours === t.parcelle.id" class="mt-2.5 border-t border-bordure pt-2.5">
              <p v-if="chargementHistorique" class="text-xs text-texte-attenue" role="status">Chargement…</p>
              <p v-else-if="historique && historique.length === 0" class="text-xs text-texte-attenue">Aucune operation enregistree sur ce dossier.</p>
              <ol v-else-if="historique" class="space-y-1.5 border-l-2 border-bordure pl-3">
                <li v-for="entree in historique" :key="entree.id" class="text-xs">
                  <span class="font-medium text-texte">{{ entree.typeOperation.replaceAll("_", " ") }}</span>
                  <span class="text-texte-attenue"> — {{ new Date(entree.horodatage).toLocaleString("fr-FR") }}</span>
                </li>
              </ol>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
