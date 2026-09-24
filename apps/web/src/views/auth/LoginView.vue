<script setup lang="ts">
import { LogIn, Shield } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { useAuthStore } from "../../stores/auth.store";
import { PHRASES } from "../../voice/phrases";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { definirPhraseCourante } = useVoiceAssistant();

onMounted(() => definirPhraseCourante(PHRASES.connexionIntro));

const email = ref("");
const motDePasse = ref("Ayinon@2026");
const enCours = ref(false);

const COMPTES_DEMO = [
  { email: "citoyen1@ayinon.bj", label: "Citoyen (proprietaire)" },
  { email: "geometre1@ayinon.bj", label: "Geometre-expert" },
  { email: "mandataire.aine@ayinon.bj", label: "Mandataire familial (Aine)" },
  { email: "andf.littoral@ayinon.bj", label: "Agent ANDF" },
  { email: "csaf1@ayinon.bj", label: "Magistrat CSAF" },
  { email: "banque1@ayinon.bj", label: "Agent banque / microfinance" },
  { email: "admin@ayinon.bj", label: "Administrateur (back-office)" },
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
  <div class="mx-auto max-w-md px-4 py-14">
    <div class="mb-6 flex flex-col items-center text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
        <Shield :size="24" aria-hidden="true" />
      </span>
      <h1 class="mt-3 text-xl font-bold text-texte">Connexion</h1>
    </div>

    <BaseCard>
      <form class="space-y-4" @submit.prevent="seConnecter">
        <BaseInput id="email" v-model="email" label="Adresse e-mail" type="email" required />
        <BaseInput id="mdp" v-model="motDePasse" label="Mot de passe" type="password" required />
        <p v-if="auth.erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ auth.erreur }}</p>
        <BaseButton type="submit" class="w-full" :disabled="enCours">
          <LogIn :size="18" aria-hidden="true" />
          Se connecter
        </BaseButton>
      </form>
    </BaseCard>

    <div class="mt-6 rounded-carte border border-dashed border-bordure p-4 text-xs text-texte-attenue">
      <p class="mb-2 font-semibold text-texte">Comptes de demonstration (mot de passe : Ayinon@2026)</p>
      <ul class="space-y-1.5">
        <li v-for="compte in COMPTES_DEMO" :key="compte.email">
          <button type="button" class="min-h-0 font-medium text-primaire underline underline-offset-2" @click="email = compte.email">
            {{ compte.email }}
          </button>
          — {{ compte.label }}
        </li>
      </ul>
    </div>
  </div>
</template>
