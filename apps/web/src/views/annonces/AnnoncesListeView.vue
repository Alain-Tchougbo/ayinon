<script setup lang="ts">
import { Bell, BellRing, Calculator, MapPin, Scale, Search, ShieldCheck, Store, Trash2, X } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";

interface AnnonceResume {
  id: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  verifieeParAndfId: string | null;
  parcelle: { nup: string; commune: string; arrondissement: string | null; superficieM2: number };
  limitesCertifiees: boolean;
  enExclusivite: boolean;
}

interface EstimationPrix {
  nombreReferences: number;
  moyenneFcfaParM2: number | null;
  message: string;
}

interface RechercheSauvegardee {
  id: string;
  nom: string;
  commune: string | null;
  prixMinFcfa: number | null;
  prixMaxFcfa: number | null;
  superficieMinM2: number | null;
  superficieMaxM2: number | null;
  verifieeAndf: boolean | null;
  limitesCertifiees: boolean | null;
  nombreNouvelles: number;
}

const auth = useAuthStore();
const annonces = ref<AnnonceResume[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

// E3.3 : comparaison cote a cote, jusqu'a 3 annonces a la fois.
const MAX_COMPARAISON = 3;
const idsComparaison = ref<string[]>([]);
const annoncesComparees = computed(() => idsComparaison.value.map((id) => annonces.value.find((a) => a.id === id)).filter((a): a is AnnonceResume => Boolean(a)));

function basculerComparaison(id: string) {
  const index = idsComparaison.value.indexOf(id);
  if (index !== -1) {
    idsComparaison.value.splice(index, 1);
  } else if (idsComparaison.value.length < MAX_COMPARAISON) {
    idsComparaison.value.push(id);
  }
}

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

// E3.2 : recherche sauvegardee avec alerte in-app (pas de SMS/email/push reel, voir docs/decisions.md).
const mesRecherches = ref<RechercheSauvegardee[]>([]);
const nomRecherche = ref("");
const sauvegardeOuverte = ref(false);
const actionRechercheEnCours = ref(false);

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

async function chargerMesRecherches() {
  if (auth.role !== RoleUtilisateur.ACHETEUR) return;
  try {
    mesRecherches.value = await api.get<RechercheSauvegardee[]>("/recherches-sauvegardees");
  } catch {
    // Silencieux : la vitrine reste utilisable meme si les recherches sauvegardees ne chargent pas.
  }
}

onMounted(() => {
  charger();
  chargerMesRecherches();
});

async function sauvegarderRecherche() {
  erreur.value = null;
  message.value = null;
  if (!nomRecherche.value.trim()) return;
  actionRechercheEnCours.value = true;
  try {
    await api.post("/recherches-sauvegardees", {
      nom: nomRecherche.value.trim(),
      commune: filtres.value.commune.trim() || undefined,
      prixMinFcfa: filtres.value.prixMinFcfa || undefined,
      prixMaxFcfa: filtres.value.prixMaxFcfa || undefined,
      superficieMinM2: filtres.value.superficieMinM2 || undefined,
      superficieMaxM2: filtres.value.superficieMaxM2 || undefined,
      verifieeAndf: filtres.value.verifieeAndf || undefined,
      limitesCertifiees: filtres.value.limitesCertifiees || undefined,
    });
    message.value = "Recherche sauvegardee. Vous serez alerte des qu'une nouvelle annonce correspond.";
    nomRecherche.value = "";
    sauvegardeOuverte.value = false;
    await chargerMesRecherches();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de sauvegarder cette recherche";
  } finally {
    actionRechercheEnCours.value = false;
  }
}

async function appliquerRecherche(r: RechercheSauvegardee) {
  filtres.value = {
    commune: r.commune ?? "",
    prixMinFcfa: r.prixMinFcfa ?? "",
    prixMaxFcfa: r.prixMaxFcfa ?? "",
    superficieMinM2: r.superficieMinM2 ?? "",
    superficieMaxM2: r.superficieMaxM2 ?? "",
    verifieeAndf: Boolean(r.verifieeAndf),
    limitesCertifiees: Boolean(r.limitesCertifiees),
  };
  await charger();
  try {
    await api.patch(`/recherches-sauvegardees/${r.id}/consulter`);
    await chargerMesRecherches();
  } catch {
    // L'alerte n'a pas pu etre remise a zero : sans consequence sur la recherche elle-meme.
  }
}

async function supprimerRecherche(id: string) {
  actionRechercheEnCours.value = true;
  try {
    await api.delete(`/recherches-sauvegardees/${id}`);
    await chargerMesRecherches();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Suppression impossible";
  } finally {
    actionRechercheEnCours.value = false;
  }
}

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
          <BaseButton
            v-if="auth.role === RoleUtilisateur.ACHETEUR && filtresActifs && !sauvegardeOuverte"
            type="button"
            taille="sm"
            variant="secondaire"
            @click="sauvegardeOuverte = true"
          >
            <Bell :size="12" aria-hidden="true" />
            Sauvegarder cette recherche
          </BaseButton>
        </div>
        <div v-if="sauvegardeOuverte" class="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
          <input
            v-model="nomRecherche"
            placeholder="Nom de cette recherche (ex. Terrains a Cotonou)"
            class="min-w-[12rem] flex-1 rounded-carte border border-bordure bg-fond px-3.5 py-2 text-sm text-texte placeholder:text-texte-attenue"
          />
          <BaseButton taille="sm" :disabled="actionRechercheEnCours || !nomRecherche.trim()" @click="sauvegarderRecherche">Enregistrer</BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="sauvegardeOuverte = false">Annuler</BaseButton>
        </div>
      </form>
    </BaseCard>

    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <!-- E3.2 : recherches sauvegardees, avec alerte in-app sur les nouvelles annonces correspondantes. -->
    <BaseCard v-if="mesRecherches.length > 0" rembourrage="sm">
      <h2 class="mb-3 text-sm font-semibold text-texte">Vos recherches sauvegardees</h2>
      <ul class="space-y-2">
        <li v-for="r in mesRecherches" :key="r.id" class="flex flex-wrap items-center justify-between gap-2 rounded-carte bg-fond px-3 py-2">
          <button type="button" class="flex items-center gap-2 text-sm text-texte hover:underline" @click="appliquerRecherche(r)">
            <BellRing v-if="r.nombreNouvelles > 0" :size="14" class="text-accent" aria-hidden="true" />
            <Bell v-else :size="14" class="text-texte-attenue" aria-hidden="true" />
            {{ r.nom }}
            <span v-if="r.nombreNouvelles > 0" class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contraste">
              {{ r.nombreNouvelles }} nouvelle(s)
            </span>
          </button>
          <button type="button" class="text-texte-attenue hover:text-danger" aria-label="Supprimer cette recherche" @click="supprimerRecherche(r.id)">
            <Trash2 :size="14" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </BaseCard>

    <!-- E3.3 : comparaison cote a cote, jusqu'a 3 annonces selectionnees via la case "Comparer". -->
    <BaseCard v-if="annoncesComparees.length > 0" rembourrage="sm">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-texte">
          <Scale :size="16" class="text-primaire" aria-hidden="true" />
          Comparaison ({{ annoncesComparees.length }}/{{ MAX_COMPARAISON }})
        </h2>
        <button type="button" class="text-xs font-medium text-texte-attenue underline underline-offset-2" @click="idsComparaison = []">
          Vider
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[32rem] text-sm">
          <tbody>
            <tr class="border-b border-bordure">
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Parcelle</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3 font-semibold text-texte">
                <RouterLink :to="`/annonces/${a.id}`" class="hover:underline">{{ a.parcelle.nup }}</RouterLink>
              </td>
            </tr>
            <tr class="border-b border-bordure">
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Commune</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3 text-texte">{{ a.parcelle.commune }}</td>
            </tr>
            <tr class="border-b border-bordure">
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Superficie</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3 text-texte">{{ a.parcelle.superficieM2.toLocaleString("fr-FR") }} m²</td>
            </tr>
            <tr class="border-b border-bordure">
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Prix</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3 font-semibold text-primaire">
                {{ a.prixIndicatifFcfa ? `${a.prixIndicatifFcfa.toLocaleString("fr-FR")} FCFA` : "A discuter" }}
              </td>
            </tr>
            <tr class="border-b border-bordure">
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Situation ANDF</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3">
                <span :class="a.verifieeParAndfId ? 'text-succes' : 'text-texte-attenue'">{{ a.verifieeParAndfId ? "Controlee" : "Non controlee" }}</span>
              </td>
            </tr>
            <tr>
              <td class="py-1.5 pr-3 text-xs font-medium text-texte-attenue">Limites certifiees</td>
              <td v-for="a in annoncesComparees" :key="a.id" class="py-1.5 pr-3">
                <span :class="a.limitesCertifiees ? 'text-accent' : 'text-texte-attenue'">{{ a.limitesCertifiees ? "Oui" : "Non" }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <section>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="annonces.length === 0" class="text-sm text-texte-attenue">
        {{ filtresActifs ? "Aucune annonce ne correspond a ces filtres." : "Aucune annonce active pour le moment." }}
      </p>
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="a in annonces" :key="a.id" class="relative">
          <label
            class="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-xs text-texte shadow-carte"
            @click.stop
          >
            <input
              type="checkbox"
              class="h-3.5 w-3.5"
              :checked="idsComparaison.includes(a.id)"
              :disabled="!idsComparaison.includes(a.id) && idsComparaison.length >= MAX_COMPARAISON"
              @change="basculerComparaison(a.id)"
            />
            Comparer
          </label>
          <BaseCard :to="`/annonces/${a.id}`">
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
              <!-- E4.5 : badge public, sans jamais reveler l'identite de l'acheteur beneficiaire. -->
              <span v-if="a.enExclusivite" class="inline-flex items-center gap-1 rounded-full bg-texte-attenue/10 px-2.5 py-0.5 text-xs font-semibold text-texte-attenue">
                En negociation exclusive
              </span>
            </div>
          </BaseCard>
        </div>
      </div>
    </section>
  </div>
</template>
