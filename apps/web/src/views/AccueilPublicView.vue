<script setup lang="ts">
import { Calculator, Map, ScanLine, Search, Store } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import HeroCarteBenin from "../components/accueil/HeroCarteBenin.vue";
import BaseButton from "../components/ui/BaseButton.vue";
import BaseCard from "../components/ui/BaseCard.vue";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { PHRASES } from "../voice/phrases";

// Vitrine publique forcee (voir router/index.ts: meta.forcerPublic) : accessible depuis le logo
// AYINON meme par un utilisateur deja connecte (voir DashboardLayout.vue), sans jamais toucher a
// sa session — contrairement a "/" (AccueilView.vue), le contenu ici ne varie jamais selon
// auth.estConnecte. PublicLayout.vue adapte deja son en-tete (acceder a mon espace / deconnexion)
// pour un visiteur qui se trouve etre connecte.
const router = useRouter();
const { definirPhraseCourante } = useVoiceAssistant();
const nup = ref("");

const RACCOURCIS = [
  { to: "/carte", icone: Map, titre: "Carte cadastrale", description: "Statut de chaque parcelle, code couleur national." },
  { to: "/annonces", icone: Store, titre: "Vitrine des annonces", description: "Parcourez les terrains publies par des vendeurs verifies." },
  { to: "/scanner", icone: ScanLine, titre: "Scanner anti-fraude", description: "Verifiez l'authenticite d'une convention de vente." },
  { to: "/simulateur-frais", icone: Calculator, titre: "Simulateur de frais", description: "Fini les rackets des demarcheurs illegaux." },
];

onMounted(() => definirPhraseCourante(PHRASES.bienvenue));

function rechercherEtOuvrirCarte() {
  const valeur = nup.value.trim();
  router.push({ name: "carte", query: valeur ? { nup: valeur } : undefined });
}
</script>

<template>
  <section class="relative h-[calc(100vh-6rem)] min-h-[28rem] overflow-hidden">
    <HeroCarteBenin />
    <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 bg-gradient-to-b from-primaire/55 to-transparent" />

    <div class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center px-4 pt-10 text-center sm:pt-14">
      <h1 class="max-w-xl font-affichage text-3xl font-normal italic text-white [text-shadow:0_2px_18px_rgba(0,0,0,.35)] sm:text-4xl">
        Retrouvez votre terrain en toute serenite.
      </h1>
      <p class="mt-3 max-w-lg text-sm text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,.3)]">
        Localisation exacte, limites certifiees, statut a jour — votre parcelle, en un instant.
      </p>

      <form
        class="pointer-events-auto mt-6 flex w-full max-w-lg items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-flottant"
        @submit.prevent="rechercherEtOuvrirCarte"
      >
        <label for="nup" class="sr-only">Numero Unique Parcellaire (NUP), commune ou coordonnees</label>
        <Search :size="18" class="shrink-0 text-texte-attenue" aria-hidden="true" />
        <input
          id="nup"
          v-model="nup"
          type="text"
          placeholder="Rechercher par NUP, commune ou coordonnees"
          class="min-h-0 w-full min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-texte focus:outline-none"
        />
        <BaseButton type="submit" variant="primaire" class="!min-h-0 shrink-0 !rounded-full">Verifier</BaseButton>
      </form>
    </div>
  </section>

  <div class="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:py-14">
    <section>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BaseCard v-for="raccourci in RACCOURCIS" :key="raccourci.to" :to="raccourci.to">
          <span class="flex h-11 w-11 items-center justify-center rounded-carte bg-primaire/10 text-primaire transition-colors group-hover:bg-primaire group-hover:text-primaire-contraste">
            <component :is="raccourci.icone" :size="22" aria-hidden="true" />
          </span>
          <h3 class="mt-3.5 font-semibold text-texte">{{ raccourci.titre }}</h3>
          <p class="mt-1 text-sm text-texte-attenue">{{ raccourci.description }}</p>
        </BaseCard>
      </div>
    </section>
  </div>
</template>
