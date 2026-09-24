<script setup lang="ts">
import { Calculator, Map, ScanLine, Search, ShieldCheck } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useParcellesStore } from "../stores/parcelles.store";
import { PHRASES } from "../voice/phrases";

const router = useRouter();
const { lire, definirPhraseCourante } = useVoiceAssistant();
const parcelles = useParcellesStore();
const nup = ref("");

onMounted(() => {
  definirPhraseCourante(PHRASES.bienvenue);
  lire(PHRASES.bienvenue);
});

async function rechercherEtOuvrirCarte() {
  if (!nup.value.trim()) {
    router.push({ name: "carte" });
    return;
  }
  await parcelles.rechercher({ nup: nup.value.trim() });
  router.push({ name: "carte" });
}

const FONCTIONNALITES = [
  { to: "/carte", icone: Map, titre: "Carte cadastrale", description: "Statut de chaque parcelle, code couleur national." },
  { to: "/scanner", icone: ScanLine, titre: "Scanner anti-fraude", description: "Verifiez l'authenticite d'une convention de vente." },
  { to: "/simulateur-frais", icone: Calculator, titre: "Simulateur de frais", description: "Fini les rackets des demarcheurs illegaux." },
  { to: "/passeport-foncier", icone: ShieldCheck, titre: "Passeport foncier", description: "Verrouillez votre parcelle contre toute vente non consentie." },
];
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:py-14">
    <section class="rounded-carte bg-primaire px-6 py-12 text-center text-primaire-contraste shadow-flottant sm:py-16">
      <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">AYINON</h1>
      <p class="mt-2 text-lg text-primaire-contraste/90">Le Gardien Numerique de la Terre</p>
      <p class="mx-auto mt-4 max-w-2xl text-sm text-primaire-contraste/80">
        Verifiez, securisez et defendez votre terre. Programme « Plus Loin, Ensemble » — territorialisation,
        democratisation du titre foncier, paix sociale.
      </p>

      <form class="mx-auto mt-7 flex max-w-md gap-2" @submit.prevent="rechercherEtOuvrirCarte">
        <label for="nup" class="sr-only">Numero Unique Parcellaire (NUP)</label>
        <div class="relative flex-1">
          <Search :size="18" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          <input
            id="nup"
            v-model="nup"
            type="text"
            placeholder="Entrez votre NUP (ex. BJ-LIT-COT-0001)"
            class="w-full rounded-carte border-0 py-3 pl-10 pr-4 text-sm text-texte"
          />
        </div>
        <button type="submit" class="shrink-0 rounded-carte bg-accent px-5 py-3 text-sm font-bold text-accent-contraste hover:brightness-110">
          Verifier
        </button>
      </form>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        v-for="fonctionnalite in FONCTIONNALITES"
        :key="fonctionnalite.to"
        :to="fonctionnalite.to"
        class="group rounded-carte border border-bordure bg-surface p-5 shadow-carte transition hover:-translate-y-0.5 hover:border-primaire hover:shadow-flottant"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-carte bg-primaire/10 text-primaire transition-colors group-hover:bg-primaire group-hover:text-primaire-contraste">
          <component :is="fonctionnalite.icone" :size="22" aria-hidden="true" />
        </span>
        <h2 class="mt-3.5 font-semibold text-texte">{{ fonctionnalite.titre }}</h2>
        <p class="mt-1 text-sm text-texte-attenue">{{ fonctionnalite.description }}</p>
      </RouterLink>
    </section>
  </div>
</template>
