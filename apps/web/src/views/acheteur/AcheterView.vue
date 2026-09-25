<script setup lang="ts">
import { Award, Handshake, Search } from "@lucide/vue";
import { onMounted, ref } from "vue";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";
import { ApiError, api } from "../../services/api";

interface MonInteret {
  id: string;
  statut: "EN_ATTENTE" | "RETENU" | "DECLINE";
  message: string | null;
  createdAt: string;
  annonce: {
    id: string;
    statut: "ACTIVE" | "RETIREE" | "VENDUE";
    prixIndicatifFcfa: number | null;
    parcelle: { nup: string; commune: string; superficieM2: number };
    publieePar: { nomComplet: string };
  };
}

const LIBELLE_STATUT: Record<MonInteret["statut"], string> = { EN_ATTENTE: "En attente", RETENU: "Retenu", DECLINE: "Decline" };
const COULEUR_STATUT: Record<MonInteret["statut"], string> = {
  EN_ATTENTE: "bg-accent/10 text-accent",
  RETENU: "bg-succes/10 text-succes",
  DECLINE: "bg-texte-attenue/10 text-texte-attenue",
};

const mesInterets = ref<MonInteret[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);

onMounted(async () => {
  chargement.value = true;
  try {
    mesInterets.value = await api.get<MonInteret[]>("/annonces/mes-interets");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger vos manifestations d'interet";
  } finally {
    chargement.value = false;
  }
});
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Acheter un terrain"
      description="Suivez ici les annonces sur lesquelles vous avez manifeste votre interet."
    >
      <template #icone><Handshake :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>

    <BaseCard rembourrage="sm" to="/annonces">
      <p class="flex items-center gap-2 text-sm font-semibold text-primaire">
        <Search :size="16" aria-hidden="true" />
        Parcourir la vitrine des annonces
      </p>
    </BaseCard>

    <section>
      <h2 class="mb-3 font-semibold text-texte">Vos manifestations d'interet</h2>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="mesInterets.length === 0" class="text-sm text-texte-attenue">
        Vous n'avez manifeste aucun interet pour le moment.
      </p>
      <ul v-else class="space-y-3">
        <li v-for="i in mesInterets" :key="i.id">
          <BaseCard :to="`/annonces/${i.annonce.id}`">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ i.annonce.parcelle.nup }} — {{ i.annonce.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">
                  {{ i.annonce.parcelle.superficieM2.toLocaleString("fr-FR") }} m² — vendeur {{ i.annonce.publieePar.nomComplet }}
                </p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[i.statut]">{{ LIBELLE_STATUT[i.statut] }}</span>
            </div>
            <p v-if="i.message" class="mt-1.5 text-xs text-texte-attenue">« {{ i.message }} »</p>
            <div v-if="i.statut === 'RETENU'" class="mt-2.5 flex items-center gap-2 rounded-carte bg-succes/10 px-3 py-2 text-xs font-semibold text-succes">
              <Award :size="14" aria-hidden="true" />
              {{ i.annonce.statut === "VENDUE" ? "Vente finalisee : le titre a ete transfere." : "Retenu par le vendeur — cession en cours de validation ANDF." }}
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
