<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth.store";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const motDePasse = ref("Ayinon@2026");
const enCours = ref(false);

const COMPTES_DEMO = [
  { email: "citoyen1@ayinon.bj", label: "Citoyen (proprietaire)" },
  { email: "geometre1@ayinon.bj", label: "Geometre-expert" },
  { email: "mandataire.aine@ayinon.bj", label: "Mandataire familial (Aine)" },
  { email: "andf.littoral@ayinon.bj", label: "Agent ANDF" },
  { email: "csaf1@ayinon.bj", label: "Magistrat CSAF" },
];

async function seConnecter() {
  enCours.value = true;
  const succes = await auth.connexion(email.value, motDePasse.value);
  enCours.value = false;
  if (succes) {
    const redirection = (route.query.redirection as string) || "/";
    router.push(redirection);
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-4 py-12">
    <h1 class="text-xl font-bold text-primaire">Connexion</h1>

    <form class="mt-6 space-y-4 rounded-carte border border-bordure bg-surface p-5" @submit.prevent="seConnecter">
      <div>
        <label for="email" class="block text-sm font-medium">Adresse e-mail</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2"
        />
      </div>
      <div>
        <label for="mdp" class="block text-sm font-medium">Mot de passe</label>
        <input
          id="mdp"
          v-model="motDePasse"
          type="password"
          required
          class="mt-1 w-full rounded-carte border border-bordure bg-fond px-3 py-2"
        />
      </div>
      <p v-if="auth.erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger">{{ auth.erreur }}</p>
      <button
        type="submit"
        class="w-full rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste"
        :disabled="enCours"
      >
        Se connecter
      </button>
    </form>

    <div class="mt-6 rounded-carte border border-dashed border-bordure p-4 text-xs text-texte-attenue">
      <p class="mb-2 font-semibold">Comptes de demonstration (mot de passe : Ayinon@2026)</p>
      <ul class="space-y-1">
        <li v-for="compte in COMPTES_DEMO" :key="compte.email">
          <button type="button" class="text-primaire underline" @click="email = compte.email">
            {{ compte.email }}
          </button>
          — {{ compte.label }}
        </li>
      </ul>
    </div>
  </div>
</template>
