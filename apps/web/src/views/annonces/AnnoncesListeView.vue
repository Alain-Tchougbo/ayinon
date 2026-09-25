<script setup lang="ts">
import { Calculator, MapPin, Search, ShieldCheck, Store, X } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";

interface AnnonceResume {
  id: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  verifieeParAndfId: string | null;
  parcelle: { nup: string; commune: string; arrondissement: string | null; superficieM2: number };
  limitesCertifiees: boolean;
}

interface EstimationPrix {
  nombreReferences: number;
  moyenneFcfaParM2: number | null;
  message: string;
}

const annonces = ref<AnnonceResume[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);

const communeEstimation = ref("");
const estimation = ref<EstimationPrix | null>(null);
const estimationEnCours = ref(false);

const FILTRES_VIDES = {
  commune: "",
  prixMinFcfa: "",
  prixMaxFcfa: "",
  superficieMinM2: "",
  superficieMaxM2: "",
  verifieeAndf: false,
  limitesCertifiees: false,
};
const filtres = ref({ ...FILTRES_VIDES });
// Les champs type="number" font caster leur valeur en Number par Vue (v-model natif), pas une
// string malgre le typage initial : String(v) avant .trim() evite un plantage du rendu.
const filtresActifs = computed(() => Object.values(filtres.value).some((v) => (typeof v === "boolean" ? v : String(v).trim() !== "")));

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    const params = new URLSearchParams();
    if (filtres.value.commune.trim()) params.set("commune", filtres.value.commune.trim());
    if (filtres.value.prixMinFcfa) params.set("prixMinFcfa", filtres.value.prixMinFcfa);
    if (filtres.value.prixMaxFcfa) params.set("prixMaxFcfa", filtres.value.prixMaxFcfa);
    if (filtres.value.superficieMinM2) params.set("superficieMinM2", filtres.value.superficieMinM2);
    if (filtres.value.superficieMaxM2) params.set("superficieMaxM2", filtres.value.superficieMaxM2);
    if (filtres.value.verifieeAndf) params.set("verifieeAndf", "true");
    if (filtres.value.limitesCertifiees) params.set("limitesCertifiees", "true");
    const qs = params.toString();
    annonces.value = await api.get<AnnonceResume[]>(`/annonces${qs ? `?${qs}` : ""}`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger la vitrine des annonces";
  } finally {
    chargement.value = false;
  }
}

function reinitialiserFiltres() {
  filtres.value = { ...FILTRES_VIDES };
  charger();
}

onMounted(charger);

async function estimer() {
  const commune = communeEstimation.value.trim();
  if (!commune) return;
  estimationEnCours.value = true;
  try {
    estimation.value = await api.get<EstimationPrix>(`/annonces/estimation-prix?commune=${encodeURIComponent(commune)}`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Estimation impossible";
  } finally {
    estimationEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
    <PageHeader
      titre="Vitrine des terrains a vendre"
      description="Toutes les parcelles publiees par des vendeurs verifies AYINON. Consultez librement ; creez un compte acheteur pour manifester votre interet."
    >
      <template #icone><Store :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard rembourrage="sm">
      <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-texte">
        <Calculator :size="16" class="text-primaire" aria-hidden="true" />
        Estimer un prix par commune
      </h2>
      <form class="flex flex-wrap gap-2" @submit.prevent="estimer">
        <input
          v-model="communeEstimation"
          placeholder="Ex. Cotonou"
          class="min-w-[10rem] flex-1 rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <BaseButton type="submit" taille="sm" :disabled="estimationEnCours || !communeEstimation.trim()">Estimer</BaseButton>
      </form>
      <div v-if="estimation" class="mt-3 rounded-carte bg-fond p-3 text-sm">
        <p v-if="estimation.moyenneFcfaParM2 !== null" class="font-semibold text-texte">
          {{ estimation.moyenneFcfaParM2.toLocaleString("fr-FR") }} FCFA / m² en moyenne
        </p>
        <p class="mt-0.5 text-xs text-texte-attenue">{{ estimation.message }}</p>
      </div>
    </BaseCard>

    <!-- E3.1 : filtres combinables (zone, prix, superficie, niveau de verification). -->
    <BaseCard rembourrage="sm">
      <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-texte">
        <Search :size="16" class="text-primaire" aria-hidden="true" />
        Filtrer les annonces
      </h2>
      <form class="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="charger">
        <input
          v-model="filtres.commune"
          placeholder="Commune"
          class="rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <input
          v-model="filtres.prixMinFcfa"
          type="number"
          placeholder="Prix min (FCFA)"
          class="rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <input
          v-model="filtres.prixMaxFcfa"
          type="number"
          placeholder="Prix max (FCFA)"
          class="rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <input
          v-model="filtres.superficieMinM2"
          type="number"
          placeholder="Superficie min (m²)"
          class="rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <input
          v-model="filtres.superficieMaxM2"
          type="number"
          placeholder="Superficie max (m²)"
          class="rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
        />
        <label class="flex items-center gap-2 text-sm text-texte">
          <input v-model="filtres.verifieeAndf" type="checkbox" class="h-4 w-4" />
          Situation controlee ANDF
        </label>
        <label class="flex items-center gap-2 text-sm text-texte">
          <input v-model="filtres.limitesCertifiees" type="checkbox" class="h-4 w-4" />
          Limites certifiees
        </label>
        <div class="flex gap-2">
          <BaseButton type="submit" taille="sm" :disabled="chargement">Rechercher</BaseButton>
          <BaseButton v-if="filtresActifs" type="button" taille="sm" variant="secondaire" @click="reinitialiserFiltres">
            <X :size="12" aria-hidden="true" />
            Reinitialiser
          </BaseButton>
        </div>
      </form>
    </BaseCard>

    <section>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="annonces.length === 0" class="text-sm text-texte-attenue">
        {{ filtresActifs ? "Aucune annonce ne correspond a ces filtres." : "Aucune annonce active pour le moment." }}
      </p>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BaseCard v-for="a in annonces" :key="a.id" :to="`/annonces/${a.id}`">
          <p class="font-semibold text-texte">{{ a.parcelle.nup }}</p>
          <p class="mt-0.5 flex items-center gap-1 text-xs text-texte-attenue">
            <MapPin :size="12" aria-hidden="true" />
            {{ a.parcelle.commune }}<span v-if="a.parcelle.arrondissement">, {{ a.parcelle.arrondissement }}</span>
          </p>
          <p class="mt-2 text-sm text-texte-attenue">{{ a.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</p>
          <p v-if="a.prixIndicatifFcfa" class="mt-1 text-lg font-bold text-primaire">{{ a.prixIndicatifFcfa.toLocaleString("fr-FR") }} FCFA</p>
          <p v-else class="mt-1 text-sm italic text-texte-attenue">Prix a discuter</p>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <span v-if="a.verifieeParAndfId" class="inline-flex items-center gap-1 rounded-full bg-succes/10 px-2.5 py-0.5 text-xs font-semibold text-succes">
              <ShieldCheck :size="12" aria-hidden="true" />
              Situation controlee ANDF
            </span>
            <span v-if="a.limitesCertifiees" class="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Limites certifiees
            </span>
          </div>
        </BaseCard>
      </div>
    </section>
  </div>
</template>
