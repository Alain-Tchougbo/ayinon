<script setup lang="ts">
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
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10 px-4 py-10">
    <section class="rounded-carte bg-primaire px-6 py-10 text-center text-primaire-contraste">
      <h1 class="text-3xl font-extrabold sm:text-4xl">AYINON</h1>
      <p class="mt-2 text-lg opacity-90">Le Gardien Numerique de la Terre</p>
      <p class="mx-auto mt-4 max-w-2xl text-sm opacity-90">
        Verifiez, securisez et defendez votre terre. Programme « Plus Loin, Ensemble » — territorialisation,
        democratisation du titre foncier, paix sociale.
      </p>

      <form class="mx-auto mt-6 flex max-w-md gap-2" @submit.prevent="rechercherEtOuvrirCarte">
        <label for="nup" class="sr-only">Numero Unique Parcellaire (NUP)</label>
        <input
          id="nup"
          v-model="nup"
          type="text"
          placeholder="Entrez votre NUP (ex. BJ-LIT-COT-0001)"
          class="flex-1 rounded-carte border-0 px-4 py-3 text-sm text-texte"
        />
        <button type="submit" class="rounded-carte bg-accent px-5 py-3 text-sm font-bold text-texte">
          Verifier
        </button>
      </form>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        to="/carte"
        class="rounded-carte border border-bordure bg-surface p-5 transition hover:border-primaire"
      >
        <p class="text-2xl">🗺️</p>
        <h2 class="mt-2 font-semibold">Carte cadastrale</h2>
        <p class="mt-1 text-sm text-texte-attenue">Statut de chaque parcelle, code couleur nationale.</p>
      </RouterLink>
      <RouterLink
        to="/scanner"
        class="rounded-carte border border-bordure bg-surface p-5 transition hover:border-primaire"
      >
        <p class="text-2xl">🔎</p>
        <h2 class="mt-2 font-semibold">Scanner anti-fraude</h2>
        <p class="mt-1 text-sm text-texte-attenue">Verifiez l'authenticite d'une convention de vente.</p>
      </RouterLink>
      <RouterLink
        to="/simulateur-frais"
        class="rounded-carte border border-bordure bg-surface p-5 transition hover:border-primaire"
      >
        <p class="text-2xl">🧮</p>
        <h2 class="mt-2 font-semibold">Simulateur de frais</h2>
        <p class="mt-1 text-sm text-texte-attenue">Fini les rackets des demarcheurs illegaux.</p>
      </RouterLink>
      <RouterLink
        to="/passeport-foncier"
        class="rounded-carte border border-bordure bg-surface p-5 transition hover:border-primaire"
      >
        <p class="text-2xl">🛂</p>
        <h2 class="mt-2 font-semibold">Passeport foncier</h2>
        <p class="mt-1 text-sm text-texte-attenue">Verrouillez votre parcelle contre toute vente non consentie.</p>
      </RouterLink>
    </section>
  </div>
</template>
