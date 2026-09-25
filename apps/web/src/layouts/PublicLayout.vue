<script setup lang="ts">
import { ChevronDown, Languages, LogIn, Menu, Shield, SunMoon, Wifi, WifiOff, X } from "@lucide/vue";
import type { LangueAssistantVocal } from "@ayinon/shared";
import { onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import VoiceAssistantButton from "../components/accessibility/VoiceAssistantButton.vue";
import { useOnlineStatus } from "../composables/useOnlineStatus";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { LANGUES } from "../voice/langues";

// Habillage des pages accessibles sans compte (accueil vitrine, carte publique, scanner
// anti-fraude, simulateur de frais, connexion) : jamais de chrome "tableau de bord" ici — ce
// layout n'est monte que lorsque auth.estConnecte est false (voir App.vue). Des qu'une session
// est active, DashboardLayout prend le relais sur les memes routes.
const LIENS_PUBLICS = [
  { to: "/annonces", label: "Annonces" },
  { to: "/carte", label: "Carte cadastrale" },
  { to: "/scanner", label: "Scanner anti-fraude" },
  { to: "/simulateur-frais", label: "Simulateur de frais" },
];

const route = useRoute();
const { enLigne } = useOnlineStatus();
const { languePreferee, definirLangue } = useVoiceAssistant();

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");
const menuMobileOuvert = ref(false);

function appliquerTheme(nouveau: Theme) {
  theme.value = nouveau;
  localStorage.setItem("ayinon_theme", nouveau);
  document.documentElement.setAttribute("data-theme", nouveau);
}

onMounted(() => appliquerTheme(theme.value));
watch(() => route.fullPath, () => (menuMobileOuvert.value = false));
</script>

<template>
  <div class="flex min-h-screen flex-col bg-fond text-texte">
    <a href="#contenu-principal" class="lien-evitement">Aller au contenu principal</a>

    <header class="sticky top-0 z-30 bg-fond px-3 pt-3 sm:px-4">
      <div
        class="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full border border-bordure bg-surface/95 px-4 py-2 shadow-flottant backdrop-blur"
      >
        <RouterLink to="/" class="flex shrink-0 items-center gap-2.5 text-base font-bold tracking-tight text-primaire">
          <span class="flex h-9 w-9 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
            <Shield :size="20" :stroke-width="2.25" aria-hidden="true" />
          </span>
          <span class="hidden sm:inline">AYINON</span>
        </RouterLink>

        <nav class="hidden items-center gap-0.5 lg:flex" aria-label="Navigation principale">
          <RouterLink
            v-for="lien in LIENS_PUBLICS"
            :key="lien.to"
            :to="lien.to"
            class="min-h-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
            active-class="!bg-primaire/10 !text-primaire !font-semibold"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>

        <div class="hidden shrink-0 items-center gap-1 lg:flex">
          <span
            class="mr-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="enLigne ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'"
          >
            <Wifi v-if="enLigne" :size="14" aria-hidden="true" />
            <WifiOff v-else :size="14" aria-hidden="true" />
            {{ enLigne ? "En ligne" : "Hors-ligne" }}
          </span>

          <div class="relative">
            <Languages :size="13" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="min-h-0 w-[7rem] appearance-none overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-0 bg-transparent py-1.5 pl-7 pr-6 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
              @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
            >
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}</option>
            </select>
            <ChevronDown :size="12" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          </div>

          <div class="relative">
            <SunMoon :size="13" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              v-model="theme"
              aria-label="Theme d'affichage"
              class="min-h-0 w-[6.25rem] appearance-none overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-0 bg-transparent py-1.5 pl-7 pr-6 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
              @change="appliquerTheme(theme)"
            >
              <option value="clair">Clair</option>
              <option value="sombre">Sombre</option>
              <option value="contraste-eleve">Plein-soleil</option>
            </select>
            <ChevronDown :size="12" class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          </div>

          <RouterLink
            to="/inscription"
            class="ml-2 inline-flex min-h-0 items-center gap-1.5 rounded-full border border-bordure px-4 py-2 text-sm font-semibold text-texte transition-colors hover:bg-fond"
          >
            Creer un compte
          </RouterLink>
          <RouterLink
            to="/connexion"
            class="inline-flex min-h-0 items-center gap-1.5 rounded-full bg-primaire px-5 py-2 text-sm font-semibold text-primaire-contraste shadow-sm transition-colors hover:bg-primaire-hover"
          >
            <LogIn :size="14" aria-hidden="true" />
            Se connecter
          </RouterLink>
        </div>

        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texte hover:bg-fond lg:hidden"
          :aria-expanded="menuMobileOuvert"
          aria-controls="menu-mobile"
          :aria-label="menuMobileOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
          @click="menuMobileOuvert = !menuMobileOuvert"
        >
          <X v-if="menuMobileOuvert" :size="22" aria-hidden="true" />
          <Menu v-else :size="22" aria-hidden="true" />
        </button>
      </div>

      <div
        id="menu-mobile"
        v-if="menuMobileOuvert"
        class="mx-auto mt-2 max-w-7xl rounded-carte border border-bordure bg-surface px-4 py-3 shadow-flottant lg:hidden"
      >
        <RouterLink
          v-for="lien in LIENS_PUBLICS"
          :key="lien.to"
          :to="lien.to"
          class="block rounded-carte px-3 py-2.5 font-medium text-texte hover:bg-fond"
          active-class="!bg-primaire/10 !text-primaire !font-semibold"
        >
          {{ lien.label }}
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
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}</option>
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

        <div class="mt-3 flex gap-2 border-t border-bordure pt-3">
          <RouterLink
            to="/inscription"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte border border-bordure px-4 py-2.5 text-sm font-semibold text-texte"
          >
            Creer un compte
          </RouterLink>
          <RouterLink
            to="/connexion"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte bg-primaire px-4 py-2.5 text-sm font-semibold text-primaire-contraste"
          >
            <LogIn :size="16" aria-hidden="true" />
            Se connecter
          </RouterLink>
        </div>
      </div>
    </header>

    <main id="contenu-principal" class="flex min-h-0 flex-1 flex-col">
      <RouterView />
    </main>

    <VoiceAssistantButton />

    <footer class="border-t border-bordure bg-surface px-4 py-4 pb-20 text-center text-xs text-texte-attenue sm:pb-4">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin
    </footer>
  </div>
</template>
