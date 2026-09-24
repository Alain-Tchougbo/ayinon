<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";

interface ConflitCsaf {
  id: string;
  motif: string;
  referenceDossierJudiciaire: string;
  dateGel: string;
  parcelle: { nup: string; commune: string; poleTerritorial: string };
}

const parcelles = useParcellesStore();
const conflitsActifs = ref<ConflitCsaf[]>([]);

const nupRecherche = ref("");
const parcelleCible = ref<{ id: string; nup: string; statut: string } | null>(null);
const motif = ref("");
const referenceDossierJudiciaire = ref("");
const motifLevee = ref("");
const message = ref<string | null>(null);
const erreur = ref<string | null>(null);
const confirmationRequise = ref(false);

onMounted(chargerConflits);

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

async function lever(conflitId: string) {
  erreur.value = null;
  try {
    await api.post("/csaf/levee", { conflitId, motifLevee: motifLevee.value || "Leve par le magistrat" });
    await chargerConflits();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Levee impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <div>
      <h1 class="text-xl font-bold text-danger">Bouton de gel conservatoire judiciaire</h1>
      <p class="mt-1 text-sm text-texte-attenue">
        En un clic, place une parcelle contestee sous sequestre : statut ROUGE immediat sur tout le territoire,
        blocage de toute vente.
      </p>
    </div>

    <form class="flex gap-2" @submit.prevent="chercherParcelle">
      <input v-model="nupRecherche" placeholder="NUP de la parcelle a geler" class="flex-1 rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />
      <button type="submit" class="rounded-carte bg-fond px-4 py-2 text-sm font-semibold">Rechercher</button>
    </form>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes">{{ message }}</p>

    <div v-if="parcelleCible" class="space-y-3 rounded-carte border-2 border-danger bg-danger/5 p-4">
      <p class="font-semibold">Parcelle : {{ parcelleCible.nup }} — statut actuel : {{ parcelleCible.statut }}</p>
      <input v-model="referenceDossierJudiciaire" placeholder="Reference du dossier judiciaire" class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />
      <textarea v-model="motif" rows="2" placeholder="Motif du gel (ex. double vente alleguee)" class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />

      <button
        v-if="!confirmationRequise"
        type="button"
        class="rounded-carte bg-danger px-4 py-2 text-sm font-bold text-white"
        :disabled="!motif || !referenceDossierJudiciaire"
        @click="confirmationRequise = true"
      >
        🔒 Geler cette parcelle
      </button>
      <div v-else class="rounded-carte border border-danger p-3">
        <p class="text-sm font-semibold text-danger">Confirmez-vous le gel conservatoire de {{ parcelleCible.nup }} ?</p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="rounded-carte bg-danger px-4 py-2 text-sm font-bold text-white" @click="confirmerGel">
            Oui, confirmer le gel
          </button>
          <button type="button" class="rounded-carte bg-fond px-4 py-2 text-sm font-semibold" @click="confirmationRequise = false">
            Annuler
          </button>
        </div>
      </div>
    </div>

    <div>
      <h2 class="mb-2 font-semibold">Conflits CSAF actifs ({{ conflitsActifs.length }})</h2>
      <ul class="space-y-2">
        <li v-for="conflit in conflitsActifs" :key="conflit.id" class="rounded-carte border border-danger/40 bg-danger/5 p-3 text-sm">
          <p class="font-semibold">{{ conflit.parcelle.nup }} — {{ conflit.parcelle.commune }}</p>
          <p class="text-texte-attenue">{{ conflit.motif }} (dossier {{ conflit.referenceDossierJudiciaire }})</p>
          <p class="text-xs text-texte-attenue">Gele le {{ new Date(conflit.dateGel).toLocaleDateString("fr-FR") }}</p>
          <button type="button" class="mt-2 rounded-carte bg-succes px-3 py-1.5 text-xs font-semibold text-white" @click="lever(conflit.id)">
            Lever le gel
          </button>
        </li>
        <li v-if="conflitsActifs.length === 0" class="text-sm text-texte-attenue">Aucun conflit actif.</li>
      </ul>
    </div>
  </div>
</template>
