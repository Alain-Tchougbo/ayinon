<script setup lang="ts">
import { Download, FileText, Flag, Gavel, Lock, Search, Unlock } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface EntreeAudit {
  id: string;
  sequence: number;
  typeOperation: string;
  roleActeur: string | null;
  payload: Record<string, unknown>;
  hashBloc: string;
  horodatage: string;
}

interface ConflitCsaf {
  id: string;
  motif: string;
  referenceDossierJudiciaire: string;
  dateGel: string;
  parcelle: { nup: string; commune: string; poleTerritorial: string };
}
interface LitigeFonde {
  id: string;
  motif: string;
  descriptif: string | null;
  decisionMotif: string | null;
  parcelle: { id: string; nup: string; commune: string };
}

const parcelles = useParcellesStore();
const { definirPhraseCourante } = useVoiceAssistant();
const conflitsActifs = ref<ConflitCsaf[]>([]);
const litigesFondes = ref<LitigeFonde[]>([]);

const nupRecherche = ref("");
const parcelleCible = ref<{ id: string; nup: string; statut: string } | null>(null);
const motif = ref("");
const referenceDossierJudiciaire = ref("");
const message = ref<string | null>(null);
const erreur = ref<string | null>(null);
const confirmationRequise = ref(false);

// Dossier de preuves numerique : historique chronologique complet de la parcelle recherchee,
// pour instruire un dossier judiciaire en quelques minutes (voir CryptoAuditService).
const historiqueDossier = ref<EntreeAudit[] | null>(null);
const chargementDossier = ref(false);

// Levee de gel : meme exigence de motif + confirmation explicite que la pose du gel, pour un acte
// judiciaire tout aussi lourd (voir audit : la levee etait auparavant un simple clic sans motif).
const conflitEnLevee = ref<string | null>(null);
const motifLeveeParConflit = ref<Record<string, string>>({});
// E8.8 : effet applique par la decision definitive.
const typeDecisionParConflit = ref<Record<string, "LEVEE_SIMPLE" | "ANNULATION_VENTE" | "TRANSFERT_FORCE">>({});
const nouveauProprietaireParConflit = ref<Record<string, string>>({});
const fichierDecisionParConflit = ref<Record<string, File | null>>({});

function surChoixFichierDecision(conflitId: string, evenement: Event) {
  const fichier = (evenement.target as HTMLInputElement).files?.[0] ?? null;
  fichierDecisionParConflit.value[conflitId] = fichier;
}

onMounted(() => {
  definirPhraseCourante(PHRASES.csafIntro);
  chargerConflits();
  chargerLitiges();
});

async function chargerConflits() {
  conflitsActifs.value = await api.get<ConflitCsaf[]>("/csaf/conflits-actifs");
}

async function chargerLitiges() {
  litigesFondes.value = await api.get<LitigeFonde[]>("/signalements/litiges-fondes");
}

async function chercherParcelle() {
  erreur.value = null;
  historiqueDossier.value = null;
  const resultats = await parcelles.rechercher({ nup: nupRecherche.value });
  parcelleCible.value = resultats[0] ?? null;
  if (!parcelleCible.value) {
    erreur.value = "Aucune parcelle trouvee";
    return;
  }
  await chargerDossier(parcelleCible.value.id);
}

function instruireLitige(litige: LitigeFonde) {
  nupRecherche.value = litige.parcelle.nup;
  motif.value = litige.motif;
  chercherParcelle();
}

async function chargerDossier(parcelleId: string) {
  chargementDossier.value = true;
  try {
    historiqueDossier.value = await api.get<EntreeAudit[]>(`/audit/parcelles/${parcelleId}/historique`);
  } finally {
    chargementDossier.value = false;
  }
}

function telechargerDossier() {
  if (!parcelleCible.value || !historiqueDossier.value) return;
  const dossier = {
    parcelle: parcelleCible.value,
    genereLe: new Date().toISOString(),
    nombreEntrees: historiqueDossier.value.length,
    historique: historiqueDossier.value,
  };
  const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = `dossier-preuves-${parcelleCible.value.nup}.json`;
  lien.click();
  URL.revokeObjectURL(url);
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
  const typeDecision = typeDecisionParConflit.value[conflitId] ?? "LEVEE_SIMPLE";
  const nouveauProprietaireNom = nouveauProprietaireParConflit.value[conflitId]?.trim() ?? "";
  if (typeDecision === "TRANSFERT_FORCE" && nouveauProprietaireNom.length < 2) {
    erreur.value = "Le nom du nouveau proprietaire designe par la decision est requis pour un transfert force";
    return;
  }
  try {
    const donnees = new FormData();
    donnees.set("conflitId", conflitId);
    donnees.set("motifLevee", motifLevee);
    donnees.set("typeDecision", typeDecision);
    if (typeDecision === "TRANSFERT_FORCE") donnees.set("nouveauProprietaireNom", nouveauProprietaireNom);
    const fichier = fichierDecisionParConflit.value[conflitId];
    if (fichier) donnees.set("fichierDecision", fichier);

    await api.postForm("/csaf/levee", donnees);
    message.value =
      typeDecision === "TRANSFERT_FORCE"
        ? "Gel leve : propriete transferee par decision judiciaire."
        : typeDecision === "ANNULATION_VENTE"
          ? "Gel leve : vente(s) en cours annulee(s) par decision judiciaire."
          : "Gel conservatoire leve.";
    conflitEnLevee.value = null;
    delete motifLeveeParConflit.value[conflitId];
    delete typeDecisionParConflit.value[conflitId];
    delete nouveauProprietaireParConflit.value[conflitId];
    delete fichierDecisionParConflit.value[conflitId];
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

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <!-- E8.2 -> E8.7 : litiges qu'un admin a qualifies fondes, en attente d'un gel decide par le
         magistrat (la qualification admin n'applique jamais elle-meme le gel, voir ET.8). Affichee
         en tete de page : c'est la file de travail prioritaire du magistrat, avant la recherche
         manuelle. -->
    <div v-if="litigesFondes.length > 0">
      <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <Flag :size="16" class="text-accent" aria-hidden="true" />
        Litiges qualifies fondes, en attente d'instruction ({{ litigesFondes.length }})
      </h2>
      <div class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Litige</th>
              <th class="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <tr v-for="litige in litigesFondes" :key="litige.id" class="align-top">
              <td class="px-4 py-3">
                <p class="font-semibold text-texte">{{ litige.parcelle.nup }} — {{ litige.parcelle.commune }}</p>
                <p class="mt-0.5 text-sm text-texte-attenue">{{ litige.motif }}</p>
                <p v-if="litige.decisionMotif" class="mt-0.5 text-xs italic text-texte-attenue">Qualification admin : {{ litige.decisionMotif }}</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <BaseButton taille="sm" variant="secondaire" @click="instruireLitige(litige)">Instruire ce dossier</BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <form class="flex gap-2" @submit.prevent="chercherParcelle">
      <div class="relative flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="nupRecherche"
          placeholder="NUP de la parcelle (gel et dossier de preuves)"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <BaseButton type="submit" variant="secondaire">Rechercher</BaseButton>
    </form>

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

    <BaseCard v-if="parcelleCible">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 font-semibold text-texte">
          <FileText :size="18" class="text-primaire" aria-hidden="true" />
          Dossier de preuves — {{ parcelleCible.nup }}
        </h2>
        <BaseButton v-if="historiqueDossier && historiqueDossier.length > 0" taille="sm" variant="secondaire" @click="telechargerDossier">
          <Download :size="14" aria-hidden="true" />
          Telecharger (JSON)
        </BaseButton>
      </div>

      <p v-if="chargementDossier" class="mt-3 text-sm text-texte-attenue" role="status">Chargement de l'historique…</p>
      <p v-else-if="historiqueDossier && historiqueDossier.length === 0" class="mt-3 text-sm text-texte-attenue">
        Aucune operation enregistree sur cette parcelle pour le moment.
      </p>
      <ol v-else-if="historiqueDossier" class="mt-3 space-y-2 border-l-2 border-bordure pl-4">
        <li v-for="entree in historiqueDossier" :key="entree.id" class="text-sm">
          <p class="font-medium text-texte">{{ entree.typeOperation.replaceAll("_", " ") }}</p>
          <p class="text-xs text-texte-attenue">
            {{ new Date(entree.horodatage).toLocaleString("fr-FR") }}
            <template v-if="entree.roleActeur"> — {{ entree.roleActeur.replaceAll("_", " ") }}</template>
          </p>
          <p class="mt-0.5 font-mono text-[0.65rem] text-texte-attenue">hash bloc : {{ entree.hashBloc.slice(0, 24) }}…</p>
        </li>
      </ol>
    </BaseCard>

    <div>
      <h2 class="mb-3 font-semibold text-texte">Conflits CSAF actifs ({{ conflitsActifs.length }})</h2>
      <p v-if="conflitsActifs.length === 0" class="text-sm text-texte-attenue">Aucun conflit actif.</p>
      <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Conflit</th>
              <th class="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <template v-for="conflit in conflitsActifs" :key="conflit.id">
              <tr class="align-top">
                <td class="px-4 py-3">
                  <p class="font-semibold text-texte">{{ conflit.parcelle.nup }} — {{ conflit.parcelle.commune }}</p>
                  <p class="mt-0.5 text-sm text-texte-attenue">{{ conflit.motif }} (dossier {{ conflit.referenceDossierJudiciaire }})</p>
                  <p class="mt-0.5 text-xs text-texte-attenue">Gele le {{ new Date(conflit.dateGel).toLocaleDateString("fr-FR") }}</p>
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <BaseButton
                    v-if="conflitEnLevee !== conflit.id"
                    variant="secondaire"
                    taille="sm"
                    @click="
                      conflitEnLevee = conflit.id;
                      typeDecisionParConflit[conflit.id] = 'LEVEE_SIMPLE';
                    "
                  >
                    <Unlock :size="14" aria-hidden="true" />
                    Lever le gel
                  </BaseButton>
                </td>
              </tr>
              <tr v-if="conflitEnLevee === conflit.id">
                <td colspan="2" class="bg-fond/40 px-4 py-3">
                  <div class="space-y-2 rounded-carte border border-bordure bg-fond p-3">
                    <div>
                      <label :for="`type-decision-${conflit.id}`" class="mb-1 block text-xs font-medium text-texte">Effet de la decision</label>
                      <select
                        :id="`type-decision-${conflit.id}`"
                        v-model="typeDecisionParConflit[conflit.id]"
                        class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                      >
                        <option value="LEVEE_SIMPLE">Levee simple (restaure le statut anterieur)</option>
                        <option value="ANNULATION_VENTE">Annulation de la vente en cours</option>
                        <option value="TRANSFERT_FORCE">Transfert force de propriete</option>
                      </select>
                    </div>
                    <div v-if="typeDecisionParConflit[conflit.id] === 'TRANSFERT_FORCE'">
                      <label :for="`nouveau-proprietaire-${conflit.id}`" class="mb-1 block text-xs font-medium text-texte">
                        Nom du proprietaire designe par la decision
                      </label>
                      <input
                        :id="`nouveau-proprietaire-${conflit.id}`"
                        v-model="nouveauProprietaireParConflit[conflit.id]"
                        class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
                      />
                    </div>
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
                    <div>
                      <label :for="`fichier-decision-${conflit.id}`" class="mb-1 block text-xs font-medium text-texte">
                        Document de la decision (optionnel)
                      </label>
                      <input
                        :id="`fichier-decision-${conflit.id}`"
                        type="file"
                        class="w-full text-xs text-texte"
                        @change="surChoixFichierDecision(conflit.id, $event)"
                      />
                    </div>
                    <p class="text-xs text-texte-attenue">Confirmez-vous la levee du gel sur {{ conflit.parcelle.nup }} ?</p>
                    <div class="flex gap-2">
                      <BaseButton taille="sm" @click="confirmerLevee(conflit.id)">Oui, lever le gel</BaseButton>
                      <BaseButton variant="secondaire" taille="sm" @click="conflitEnLevee = null">Annuler</BaseButton>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
