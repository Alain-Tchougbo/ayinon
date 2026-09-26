<script setup lang="ts">
import { ChevronDown, Map, Search, X } from "@lucide/vue";
import { StatutParcelle } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import LegendeStatuts from "../components/map/LegendeStatuts.vue";
import MapCadastral from "../components/map/MapCadastral.vue";
import BaseButton from "../components/ui/BaseButton.vue";
import type { ParcelleCache } from "../db/localDb";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useParcellesStore } from "../stores/parcelles.store";
import { PHRASES } from "../voice/phrases";
import PageHeader from "../components/ui/PageHeader.vue";

const route = useRoute();
const parcelles = useParcellesStore();
const { definirPhraseCourante, lire } = useVoiceAssistant();

type ModeRecherche = "nup" | "nom";
const modeRecherche = ref<ModeRecherche>("nup");
const texteRecherche = ref("");
const resultatsRecherche = ref<ParcelleCache[] | null>(null);
const rechercheEnCours = ref(false);
const aucunResultat = ref(false);

// Filtres complementaires a la recherche NUP/proprietaire (se combinent avec elle) : reels,
// derives des donnees deja chargees, jamais une liste inventee de communes/statuts.
const communeFiltre = ref("");
const statutFiltre = ref<StatutParcelle | "">("");
const LIBELLE_STATUT: Record<StatutParcelle, string> = {
  TITREE: "Titree et securisee",
  EN_COURS: "En cours de securisation",
  GEL_CSAF: "Gel conservatoire (CSAF)",
  DOMAINE_PUBLIC: "Domaine public",
};
const communesDisponibles = computed(() => [...new Set(parcelles.parcelles.map((p) => p.commune))].sort((a, b) => a.localeCompare(b, "fr")));

const parcellesAffichees = computed(() => {
  const base = resultatsRecherche.value ?? parcelles.parcelles;
  return base.filter(
    (p) => (!communeFiltre.value || p.commune === communeFiltre.value) && (!statutFiltre.value || p.statut === statutFiltre.value),
  );
});

onMounted(async () => {
  definirPhraseCourante(PHRASES.carteIntro);
  await parcelles.chargerToutes();

  const nupInitial = route.query.nup;
  if (typeof nupInitial === "string" && nupInitial.trim()) {
    texteRecherche.value = nupInitial.trim();
    await rechercher();
  }
});

async function rechercher() {
  const valeur = texteRecherche.value.trim();
  if (!valeur) {
    resultatsRecherche.value = null;
    aucunResultat.value = false;
    return;
  }
  rechercheEnCours.value = true;
  try {
    const dto = modeRecherche.value === "nup" ? { nup: valeur } : { nomProprietaire: valeur };
    const resultats = await parcelles.rechercher(dto);
    resultatsRecherche.value = resultats;
    aucunResultat.value = resultats.length === 0;
  } finally {
    rechercheEnCours.value = false;
  }
}

function reinitialiser() {
  texteRecherche.value = "";
  resultatsRecherche.value = null;
  aucunResultat.value = false;
}

const PHRASE_PAR_STATUT: Record<string, (typeof PHRASES)[keyof typeof PHRASES]> = {
  TITREE: PHRASES.parcelleTitree,
  EN_COURS: PHRASES.parcelleEnCours,
  GEL_CSAF: PHRASES.parcelleGelCsaf,
  DOMAINE_PUBLIC: PHRASES.parcelleDomainePublic,
};

function surSelection(parcelle: { statut: string }) {
  const phrase = PHRASE_PAR_STATUT[parcelle.statut];
  if (phrase) lire(phrase);
}
</script>

<template>
  <div class="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <PageHeader titre="Carte cadastrale nationale">
        <template #icone><Map :size="20" class="text-primaire" aria-hidden="true" /></template>
      </PageHeader>
      <span v-if="parcelles.horsLigne" class="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
        Donnees issues du cache local (hors-ligne)
      </span>
    </div>

    <form class="flex flex-wrap items-center gap-2" @submit.prevent="rechercher">
      <div class="inline-flex rounded-carte border border-bordure bg-surface p-0.5 text-xs font-semibold">
        <button
          type="button"
          class="rounded-[calc(1rem-0.125rem)] px-3 py-1.5"
          :class="modeRecherche === 'nup' ? 'bg-primaire text-primaire-contraste' : 'text-texte-attenue'"
          @click="modeRecherche = 'nup'"
        >
          Par NUP
        </button>
        <button
          type="button"
          class="rounded-[calc(1rem-0.125rem)] px-3 py-1.5"
          :class="modeRecherche === 'nom' ? 'bg-primaire text-primaire-contraste' : 'text-texte-attenue'"
          @click="modeRecherche = 'nom'"
        >
          Par nom du proprietaire
        </button>
      </div>

      <div class="relative min-w-[16rem] flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="texteRecherche"
          :placeholder="modeRecherche === 'nup' ? 'Ex. BJ-LIT-COT-0001' : 'Ex. Kodjo AGBOSSOU'"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <BaseButton type="submit" taille="sm" :disabled="rechercheEnCours || !texteRecherche.trim()">Rechercher</BaseButton>
      <BaseButton v-if="resultatsRecherche" type="button" taille="sm" variant="secondaire" @click="reinitialiser">
        <X :size="14" aria-hidden="true" />
        Voir toutes les parcelles
      </BaseButton>
    </form>

    <div class="flex flex-wrap items-center gap-2">
      <div class="relative">
        <select
          v-model="communeFiltre"
          class="min-h-0 appearance-none rounded-carte border border-bordure bg-surface py-2 pl-3 pr-8 text-xs font-medium text-texte"
        >
          <option value="">Toutes les communes</option>
          <option v-for="commune in communesDisponibles" :key="commune" :value="commune">{{ commune }}</option>
        </select>
        <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
      </div>
      <div class="relative">
        <select
          v-model="statutFiltre"
          class="min-h-0 appearance-none rounded-carte border border-bordure bg-surface py-2 pl-3 pr-8 text-xs font-medium text-texte"
        >
          <option value="">Tous les statuts</option>
          <option v-for="statut in Object.values(StatutParcelle)" :key="statut" :value="statut">{{ LIBELLE_STATUT[statut] }}</option>
        </select>
        <ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
      </div>
      <span v-if="communeFiltre || statutFiltre" class="text-xs text-texte-attenue">{{ parcellesAffichees.length }} parcelle(s) affichee(s)</span>
      <button
        v-if="communeFiltre || statutFiltre"
        type="button"
        class="text-xs font-semibold text-primaire"
        @click="communeFiltre = ''; statutFiltre = '';"
      >
        Reinitialiser les filtres
      </button>
    </div>
    <p v-if="resultatsRecherche && !aucunResultat" class="text-xs text-texte-attenue">
      {{ resultatsRecherche.length }} parcelle(s) trouvee(s).
    </p>
    <p v-if="aucunResultat" class="rounded-carte bg-accent/10 p-3 text-sm text-accent" role="status">
      Aucune parcelle ne correspond a cette recherche.
    </p>

    <LegendeStatuts />
    <div class="relative flex min-h-[320px] flex-1">
      <div
        v-if="parcelles.chargement"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-carte bg-fond/70 text-sm font-medium text-texte-attenue"
        role="status"
      >
        Chargement de la carte cadastrale…
      </div>
      <div
        v-else-if="parcellesAffichees.length === 0"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-carte border border-dashed border-bordure bg-surface text-sm text-texte-attenue"
      >
        Aucune parcelle disponible pour le moment.
      </div>
      <MapCadastral :parcelles="parcellesAffichees" @selection="surSelection" />
    </div>
  </div>
</template>
