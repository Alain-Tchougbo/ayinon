<script setup lang="ts">
import { Languages, LogIn, LogOut, Menu, Shield, SunMoon, Wifi, WifiOff, X } from "@lucide/vue";
import { LangueAssistantVocal } from "@ayinon/shared";
import { onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantBar from "./components/accessibility/VoiceAssistantBar.vue";
import BaseButton from "./components/ui/BaseButton.vue";
import { useOnlineStatus } from "./composables/useOnlineStatus";
import { useVoiceAssistant } from "./composables/useVoiceAssistant";
import { useAuthStore } from "./stores/auth.store";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { enLigne } = useOnlineStatus();
const { languePreferee, definirLangue } = useVoiceAssistant();

const LANGUES: Array<{ valeur: LangueAssistantVocal; label: string }> = [
  { valeur: LangueAssistantVocal.FR, label: "Francais" },
  { valeur: LangueAssistantVocal.FON, label: "Fɔngbe" },
  { valeur: LangueAssistantVocal.YORUBA, label: "Yorùbá" },
  { valeur: LangueAssistantVocal.BARIBA, label: "Bariba" },
];

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");
const menuMobileOuvert = ref(false);

function appliquerTheme(nouveau: Theme) {
  theme.value = nouveau;
  localStorage.setItem("ayinon_theme", nouveau);
  document.documentElement.setAttribute("data-theme", nouveau);
}

// Le chargement de la session est deja assure par le garde de navigation (router/index.ts)
// avant la toute premiere resolution de route ; l'appeler de nouveau ici doublerait inutilement
// la requete /auth/moi (et son eventuelle tentative de rafraichissement) a chaque montage.
onMounted(() => {
  appliquerTheme(theme.value);
});

// Ferme le panneau mobile a chaque changement de page (evite un menu ouvert qui persiste apres navigation).
watch(() => route.fullPath, () => (menuMobileOuvert.value = false));

async function seDeconnecter() {
  await auth.deconnexion();
  router.push({ name: "accueil" });
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-fond text-texte">
    <a href="#contenu-principal" class="lien-evitement">Aller au contenu principal</a>

    <header class="sticky top-0 z-30 border-b border-bordure bg-surface/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <RouterLink to="/" class="flex shrink-0 items-center gap-2.5 text-base font-bold tracking-tight text-primaire">
          <span class="flex h-9 w-9 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
            <Shield :size="20" :stroke-width="2.25" aria-hidden="true" />
          </span>
          <span class="hidden sm:inline">AYINON</span>
        </RouterLink>

        <!-- Nav volontairement minimale : l'accueil (logo) sert de tableau de bord complet et
             personnalise par role. Un seul lien partage evite tout risque de debordement,
             quel que soit le role connecte ou la largeur d'ecran. -->
        <nav class="hidden lg:block" aria-label="Navigation principale">
          <RouterLink
            to="/carte"
            class="min-h-0 whitespace-nowrap rounded-carte px-3 py-2 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
            active-class="!bg-primaire !text-primaire-contraste"
          >
            Carte cadastrale
          </RouterLink>
        </nav>

        <div class="hidden shrink-0 items-center gap-2 lg:flex">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="enLigne ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'"
          >
            <Wifi v-if="enLigne" :size="14" aria-hidden="true" />
            <WifiOff v-else :size="14" aria-hidden="true" />
            {{ enLigne ? "En ligne" : "Hors-ligne" }}
          </span>

          <div class="relative">
            <Languages :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="min-h-0 rounded-carte border border-bordure bg-surface py-1.5 pl-7 pr-2 text-xs font-medium text-texte"
              @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
            >
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}</option>
            </select>
          </div>

          <div class="relative">
            <SunMoon :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              v-model="theme"
              aria-label="Theme d'affichage"
              class="min-h-0 rounded-carte border border-bordure bg-surface py-1.5 pl-7 pr-2 text-xs font-medium text-texte"
              @change="appliquerTheme(theme)"
            >
              <option value="clair">Clair</option>
              <option value="sombre">Sombre</option>
              <option value="contraste-eleve">Plein-soleil</option>
            </select>
          </div>

          <template v-if="auth.estConnecte">
            <span class="max-w-[10rem] truncate text-xs text-texte-attenue">{{ auth.utilisateur?.nomComplet }}</span>
            <BaseButton taille="sm" variant="ghost" class="min-h-0" @click="seDeconnecter">
              <LogOut :size="14" aria-hidden="true" />
              Se deconnecter
            </BaseButton>
          </template>
          <BaseButton v-else taille="sm" class="min-h-0" to="/connexion">
            <LogIn :size="14" aria-hidden="true" />
            Se connecter
          </BaseButton>
        </div>

        <!-- Sous lg : bouton hamburger unique, tout le reste passe dans le panneau deplie ci-dessous. -->
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-carte text-texte hover:bg-fond lg:hidden"
          :aria-expanded="menuMobileOuvert"
          aria-controls="menu-mobile"
          :aria-label="menuMobileOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
          @click="menuMobileOuvert = !menuMobileOuvert"
        >
          <X v-if="menuMobileOuvert" :size="22" aria-hidden="true" />
          <Menu v-else :size="22" aria-hidden="true" />
        </button>
      </div>

      <div id="menu-mobile" v-if="menuMobileOuvert" class="border-t border-bordure bg-surface px-4 py-3 lg:hidden">
        <RouterLink
          to="/carte"
          class="block rounded-carte px-3 py-2.5 font-medium text-texte hover:bg-fond"
          active-class="!bg-primaire !text-primaire-contraste"
        >
          Carte cadastrale
        </RouterLink>

        <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-bordure pt-3">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="enLigne ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'"
          >
            <Wifi v-if="enLigne" :size="14" aria-hidden="true" />
            <WifiOff v-else :size="14" aria-hidden="true" />
            {{ enLigne ? "En ligne" : "Hors-ligne" }}
          </span>
          <div class="relative">
            <Languages :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="rounded-carte border border-bordure bg-surface py-1.5 pl-7 pr-2 text-xs font-medium text-texte"
              @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
            >
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}</option>
            </select>
          </div>
          <div class="relative">
            <SunMoon :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              v-model="theme"
              aria-label="Theme d'affichage"
              class="rounded-carte border border-bordure bg-surface py-1.5 pl-7 pr-2 text-xs font-medium text-texte"
              @change="appliquerTheme(theme)"
            >
              <option value="clair">Clair</option>
              <option value="sombre">Sombre</option>
              <option value="contraste-eleve">Plein-soleil</option>
            </select>
          </div>
        </div>

        <div class="mt-3 border-t border-bordure pt-3">
          <template v-if="auth.estConnecte">
            <p class="mb-2 truncate text-sm text-texte-attenue">{{ auth.utilisateur?.nomComplet }}</p>
            <BaseButton variant="secondaire" class="w-full" @click="seDeconnecter">
              <LogOut :size="16" aria-hidden="true" />
              Se deconnecter
            </BaseButton>
          </template>
          <BaseButton v-else class="w-full" to="/connexion">
            <LogIn :size="16" aria-hidden="true" />
            Se connecter
          </BaseButton>
        </div>
      </div>
    </header>

    <main id="contenu-principal" class="flex min-h-0 flex-1 flex-col">
      <RouterView />
    </main>

    <VoiceAssistantBar />

    <footer class="border-t border-bordure bg-surface py-4 text-center text-xs text-texte-attenue">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin
    </footer>
  </div>
</template>
