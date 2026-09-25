<script setup lang="ts">
import { CalendarClock, Flag, Handshake, MapPin, ShieldCheck, Star, Store } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";

interface AnnonceDetail {
  id: string;
  prixIndicatifFcfa: number | null;
  description: string | null;
  statut: "ACTIVE" | "RETIREE" | "VENDUE";
  verifieeParAndfId: string | null;
  parcelle: { nup: string; commune: string; arrondissement: string | null; superficieM2: number };
  publieePar: { id: string; nomComplet: string };
  interets: Array<{ acheteur: { id: string } }>;
  limitesCertifiees: boolean;
  enExclusivite: boolean;
}

interface ProfilVendeur {
  noteMoyenne: number | null;
  nombreAvis: number;
  ventesConclues: number;
}

const route = useRoute();
const auth = useAuthStore();

const annonce = ref<AnnonceDetail | null>(null);
const profilVendeur = ref<ProfilVendeur | null>(null);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const messageInteret = ref("");
const envoiEnCours = ref(false);

const visiteOuverte = ref(false);
const dateVisite = ref("");
const modeVisite = ref<"PRESENTIEL" | "VIDEO">("PRESENTIEL");
const messageVisite = ref("");
const visiteEnvoyee = ref(false);
const visiteEnCours = ref(false);

const ROLES_SIGNALANTS: RoleUtilisateur[] = [
  RoleUtilisateur.CITOYEN,
  RoleUtilisateur.VENDEUR,
  RoleUtilisateur.ACHETEUR,
  RoleUtilisateur.MANDATAIRE_FAMILIAL,
];
const signalementOuvert = ref(false);
const typeSignalement = ref<"ANNONCE" | "LITIGE_FONCIER">("ANNONCE");
const motifSignalement = ref("");
const descriptifSignalement = ref("");
const signalementEnvoye = ref(false);
const signalementEnCours = ref(false);

const dejaManifeste = computed(() => annonce.value?.interets.some((i) => i.acheteur.id === auth.utilisateur?.id) ?? false);
const peutSignaler = computed(
  () =>
    auth.role !== null &&
    ROLES_SIGNALANTS.includes(auth.role) &&
    auth.utilisateur?.id !== annonce.value?.publieePar.id,
);

async function charger() {
  chargement.value = true;
  try {
    annonce.value = await api.get<AnnonceDetail>(`/annonces/${route.params.id}`);
    profilVendeur.value = await api.get<ProfilVendeur>(`/avis/profil/${annonce.value.publieePar.id}`);
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Annonce introuvable";
  } finally {
    chargement.value = false;
  }
}

onMounted(charger);

async function manifesterInteret() {
  erreur.value = null;
  message.value = null;
  envoiEnCours.value = true;
  try {
    await api.post(`/annonces/${route.params.id}/interet`, { message: messageInteret.value.trim() || undefined });
    message.value = "Votre interet a bien ete transmis au vendeur.";
    messageInteret.value = "";
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer votre interet";
  } finally {
    envoiEnCours.value = false;
  }
}

async function demanderVisite() {
  erreur.value = null;
  if (!dateVisite.value) {
    erreur.value = "Choisissez une date et une heure pour la visite";
    return;
  }
  visiteEnCours.value = true;
  try {
    await api.post(`/visites/annonces/${route.params.id}`, {
      dateProposee: new Date(dateVisite.value).toISOString(),
      mode: modeVisite.value,
      message: messageVisite.value.trim() || undefined,
    });
    visiteEnvoyee.value = true;
    visiteOuverte.value = false;
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer la demande de visite";
  } finally {
    visiteEnCours.value = false;
  }
}

async function signaler() {
  erreur.value = null;
  const motif = motifSignalement.value.trim();
  if (motif.length < 10) {
    erreur.value = "Decrivez le probleme en au moins 10 caracteres";
    return;
  }
  signalementEnCours.value = true;
  try {
    await api.post("/signalements", {
      type: typeSignalement.value,
      annonceId: route.params.id,
      motif,
      descriptif: descriptifSignalement.value.trim() || undefined,
    });
    signalementEnvoye.value = true;
    signalementOuvert.value = false;
    typeSignalement.value = "ANNONCE";
    motifSignalement.value = "";
    descriptifSignalement.value = "";
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer le signalement";
  } finally {
    signalementEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <template v-else-if="annonce">
      <PageHeader :titre="annonce.parcelle.nup" :description="`${annonce.parcelle.commune}${annonce.parcelle.arrondissement ? ', ' + annonce.parcelle.arrondissement : ''}`">
        <template #icone><Store :size="22" class="text-primaire" aria-hidden="true" /></template>
      </PageHeader>

      <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
      <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

      <BaseCard>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="flex items-center gap-1 text-sm text-texte-attenue">
              <MapPin :size="14" aria-hidden="true" />
              {{ annonce.parcelle.superficieM2.toLocaleString("fr-FR") }} m²
            </p>
            <p v-if="annonce.prixIndicatifFcfa" class="mt-1 text-2xl font-bold text-primaire">
              {{ annonce.prixIndicatifFcfa.toLocaleString("fr-FR") }} FCFA
            </p>
            <p v-else class="mt-1 text-sm italic text-texte-attenue">Prix a discuter avec le vendeur</p>
          </div>
          <span v-if="annonce.statut !== 'ACTIVE'" class="rounded-full bg-texte-attenue/10 px-2.5 py-0.5 text-xs font-semibold text-texte-attenue">
            {{ annonce.statut === "VENDUE" ? "Vendue" : "Retiree" }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5">
          <span v-if="annonce.verifieeParAndfId" class="inline-flex items-center gap-1 rounded-full bg-succes/10 px-2.5 py-0.5 text-xs font-semibold text-succes">
            <ShieldCheck :size="12" aria-hidden="true" />
            Situation fonciere controlee par l'ANDF
          </span>
          <span v-if="annonce.limitesCertifiees" class="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            Limites certifiees par un geometre
          </span>
          <!-- E4.5 : badge public, sans jamais reveler l'identite de l'acheteur beneficiaire. -->
          <span v-if="annonce.enExclusivite" class="inline-flex items-center gap-1 rounded-full bg-texte-attenue/10 px-2.5 py-0.5 text-xs font-semibold text-texte-attenue">
            En negociation exclusive
          </span>
        </div>

        <p v-if="annonce.description" class="mt-4 whitespace-pre-line text-sm text-texte">{{ annonce.description }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-texte-attenue">
          <span>Publiee par {{ annonce.publieePar.nomComplet }}</span>
          <template v-if="profilVendeur">
            <span v-if="profilVendeur.noteMoyenne !== null" class="flex items-center gap-1 font-medium text-texte">
              <Star :size="12" class="fill-accent text-accent" aria-hidden="true" />
              {{ profilVendeur.noteMoyenne }} ({{ profilVendeur.nombreAvis }} avis)
            </span>
            <span>{{ profilVendeur.ventesConclues }} vente(s) conclue(s)</span>
          </template>
        </div>
      </BaseCard>

      <!-- E3.5 : demander une visite avant de s'engager davantage. -->
      <BaseCard v-if="annonce.statut === 'ACTIVE' && auth.role === RoleUtilisateur.ACHETEUR">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-texte">
          <CalendarClock :size="16" class="text-primaire" aria-hidden="true" />
          Demander une visite
        </h2>
        <p v-if="visiteEnvoyee" class="text-sm text-texte-attenue">
          Votre demande de visite a ete envoyee au vendeur. Retrouvez son statut depuis votre espace "Acheter un terrain".
        </p>
        <template v-else>
          <button
            v-if="!visiteOuverte"
            type="button"
            class="text-sm font-medium text-primaire underline underline-offset-2"
            @click="visiteOuverte = true"
          >
            Proposer un creneau de visite
          </button>
          <form v-else class="space-y-3" @submit.prevent="demanderVisite">
            <div>
              <label for="date-visite" class="mb-1 block text-xs font-medium text-texte">Date et heure souhaitees</label>
              <input
                id="date-visite"
                v-model="dateVisite"
                type="datetime-local"
                class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte"
              />
            </div>
            <div class="flex gap-4 text-xs text-texte">
              <label class="flex items-center gap-1.5">
                <input v-model="modeVisite" type="radio" value="PRESENTIEL" />
                Sur place
              </label>
              <label class="flex items-center gap-1.5">
                <input v-model="modeVisite" type="radio" value="VIDEO" />
                A distance (video)
              </label>
            </div>
            <textarea
              v-model="messageVisite"
              rows="2"
              placeholder="Un message pour le vendeur (optionnel)"
              class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte placeholder:text-texte-attenue"
            />
            <div class="flex gap-2">
              <BaseButton type="submit" taille="sm" :disabled="visiteEnCours">Envoyer la demande</BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="visiteOuverte = false">Annuler</BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>

      <BaseCard v-if="annonce.statut === 'ACTIVE' && auth.role === RoleUtilisateur.ACHETEUR">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-texte">
          <Handshake :size="16" class="text-primaire" aria-hidden="true" />
          Manifester mon interet
        </h2>
        <p v-if="dejaManifeste" class="text-sm text-texte-attenue">
          Vous avez deja manifeste votre interet sur cette annonce. Le vendeur a ete notifie.
        </p>
        <p v-else-if="annonce.enExclusivite" class="text-sm text-texte-attenue">
          Cette annonce est en negociation exclusive avec un autre acheteur pour le moment.
        </p>
        <form v-else class="space-y-3" @submit.prevent="manifesterInteret">
          <textarea
            v-model="messageInteret"
            rows="3"
            placeholder="Un message pour le vendeur (optionnel)"
            class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte placeholder:text-texte-attenue"
          />
          <BaseButton type="submit" :disabled="envoiEnCours">Envoyer mon interet</BaseButton>
        </form>
      </BaseCard>

      <p v-else-if="annonce.statut === 'ACTIVE' && !auth.estConnecte" class="text-sm text-texte-attenue">
        <RouterLink to="/inscription" class="font-medium text-primaire underline underline-offset-2">Creez un compte acheteur</RouterLink>
        pour manifester votre interet sur cette parcelle.
      </p>

      <!-- E2.6 : signaler un probleme sur l'annonce (occupant, litige non declare, prix suspect...). -->
      <BaseCard v-if="peutSignaler" rembourrage="sm">
        <p v-if="signalementEnvoye" class="text-sm text-texte-attenue">
          Signalement transmis a l'equipe de moderation. Merci de contribuer a la fiabilite de la vitrine.
        </p>
        <template v-else>
          <button
            v-if="!signalementOuvert"
            type="button"
            class="flex items-center gap-1.5 text-xs font-medium text-texte-attenue underline underline-offset-2 hover:text-texte"
            @click="signalementOuvert = true"
          >
            <Flag :size="13" aria-hidden="true" />
            Signaler un probleme sur cette annonce
          </button>
          <form v-else class="space-y-2.5" @submit.prevent="signaler">
            <p class="flex items-center gap-1.5 text-sm font-semibold text-texte">
              <Flag :size="14" class="text-danger" aria-hidden="true" />
              Signaler un probleme
            </p>
            <div class="flex gap-4 text-xs text-texte">
              <label class="flex items-center gap-1.5">
                <input v-model="typeSignalement" type="radio" value="ANNONCE" />
                Probleme sur l'annonce (occupant, prix suspect...)
              </label>
              <label class="flex items-center gap-1.5">
                <input v-model="typeSignalement" type="radio" value="LITIGE_FONCIER" />
                Litige foncier sur la parcelle
              </label>
            </div>
            <textarea
              v-model="motifSignalement"
              rows="2"
              placeholder="Ex. parcelle deja occupee, litige familial non declare, prix suspect..."
              class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-xs text-texte placeholder:text-texte-attenue"
            />
            <textarea
              v-model="descriptifSignalement"
              rows="2"
              placeholder="Details complementaires (optionnel)"
              class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-xs text-texte placeholder:text-texte-attenue"
            />
            <div class="flex gap-2">
              <BaseButton taille="sm" variant="danger" type="submit" :disabled="signalementEnCours">Envoyer le signalement</BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="signalementOuvert = false">Annuler</BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>
    </template>
  </div>
</template>
