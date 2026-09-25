<script setup lang="ts">
import { Handshake, MapPin, ShieldCheck, Store } from "@lucide/vue";
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
}

const route = useRoute();
const auth = useAuthStore();

const annonce = ref<AnnonceDetail | null>(null);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const messageInteret = ref("");
const envoiEnCours = ref(false);

const dejaManifeste = computed(() => annonce.value?.interets.some((i) => i.acheteur.id === auth.utilisateur?.id) ?? false);

async function charger() {
  chargement.value = true;
  try {
    annonce.value = await api.get<AnnonceDetail>(`/annonces/${route.params.id}`);
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
        </div>

        <p v-if="annonce.description" class="mt-4 whitespace-pre-line text-sm text-texte">{{ annonce.description }}</p>
        <p class="mt-4 text-xs text-texte-attenue">Publiee par {{ annonce.publieePar.nomComplet }}</p>
      </BaseCard>

      <BaseCard v-if="annonce.statut === 'ACTIVE' && auth.role === RoleUtilisateur.ACHETEUR">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-texte">
          <Handshake :size="16" class="text-primaire" aria-hidden="true" />
          Manifester mon interet
        </h2>
        <p v-if="dejaManifeste" class="text-sm text-texte-attenue">
          Vous avez deja manifeste votre interet sur cette annonce. Le vendeur a ete notifie.
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
    </template>
  </div>
</template>
