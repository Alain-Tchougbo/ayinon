<script setup lang="ts">
import { ChevronDown, LayoutDashboard, Languages, LogIn, LogOut, Menu, SunMoon, Wifi, WifiOff, X } from "@lucide/vue";
import type { LangueAssistantVocal } from "@ayinon/shared";
import { onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import VoiceAssistantButton from "../components/accessibility/VoiceAssistantButton.vue";
import ChatbotWidget from "../components/chatbot/ChatbotWidget.vue";
import { useOnlineStatus } from "../composables/useOnlineStatus";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useAuthStore } from "../stores/auth.store";
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
const auth = useAuthStore();
const { enLigne } = useOnlineStatus();

// Un utilisateur connecte peut atterrir ici via le logo (route /public, meta.forcerPublic — voir
// App.vue) sans jamais perdre sa session : l'en-tete propose alors de revenir a son espace ou de
// se deconnecter, plutot que de lui remontrer "Se connecter"/"Creer un compte" comme a un visiteur.
async function seDeconnecter() {
  await auth.deconnexion();
}
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

    <header class="sticky top-0 z-30">
      <!-- Bandeau institutionnel : situe AYINON comme plateforme independante qui recoupe les
           donnees du cadastre national, pas comme un portail officiel ANDF — voir docs/DEMO.md. -->
      <div class="hidden items-center justify-between gap-3 bg-primaire-fonce px-4 py-1.5 text-xs font-semibold text-primaire-contraste/70 lg:flex">
        <span class="truncate">Plateforme independante de verification fonciere — donnees recoupees avec le cadastre national de l'ANDF</span>
        <div class="flex shrink-0 items-center gap-4">
          <a href="https://andf.bj" target="_blank" rel="noopener" class="min-h-0 shrink-0 transition-colors hover:text-primaire-contraste">andf.bj ↗</a>
          <span class="inline-flex items-center gap-1.5" :class="enLigne ? 'text-succes' : 'text-danger'">
            <Wifi v-if="enLigne" :size="13" aria-hidden="true" />
            <WifiOff v-else :size="13" aria-hidden="true" />
            {{ enLigne ? "En ligne" : "Hors-ligne" }}
          </span>
          <div class="relative">
            <Languages :size="12" class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="min-h-0 w-[6.5rem] appearance-none overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent py-0 pl-4 pr-4 text-xs font-semibold text-primaire-contraste/70 transition-colors hover:text-primaire-contraste"
              @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
            >
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur" class="text-texte">
                {{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}
              </option>
            </select>
            <ChevronDown :size="10" class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" aria-hidden="true" />
          </div>
          <div class="relative">
            <SunMoon :size="12" class="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <select
              v-model="theme"
              aria-label="Theme d'affichage"
              class="min-h-0 w-[5.5rem] appearance-none overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent py-0 pl-4 pr-4 text-xs font-semibold text-primaire-contraste/70 transition-colors hover:text-primaire-contraste"
              @change="appliquerTheme(theme)"
            >
              <option value="clair" class="text-texte">Clair</option>
              <option value="sombre" class="text-texte">Sombre</option>
              <option value="contraste-eleve" class="text-texte">Plein-soleil</option>
            </select>
            <ChevronDown :size="10" class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 bg-primaire px-4 py-3 text-primaire-contraste sm:px-6">
        <RouterLink to="/" class="flex shrink-0 items-center gap-2.5 font-affichage text-lg font-bold tracking-tight">
          <svg viewBox="0 0 32 32" fill="none" class="h-7 w-7 shrink-0" aria-hidden="true">
            <path d="M6 22L10 8L24 6L27 20L16 27Z" stroke="#F2A93B" stroke-width="1.6" stroke-linejoin="round" />
            <circle cx="10" cy="8" r="1.6" fill="#F2A93B" />
          </svg>
          Ayinon
        </RouterLink>

        <nav class="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
          <RouterLink
            v-for="lien in LIENS_PUBLICS"
            :key="lien.to"
            :to="lien.to"
            class="relative min-h-0 whitespace-nowrap py-1 text-sm font-semibold text-primaire-contraste/80 transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-primaire-contraste hover:after:scale-x-100"
            active-class="!text-primaire-contraste after:!scale-x-100"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>

        <div v-if="auth.estConnecte" class="hidden shrink-0 items-center gap-4 lg:flex">
          <button
            type="button"
            class="relative min-h-0 py-1 text-sm font-semibold text-primaire-contraste/80 transition-colors hover:text-primaire-contraste"
            @click="seDeconnecter"
          >
            Se deconnecter
          </button>
          <RouterLink
            to="/"
            class="inline-flex min-h-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-contraste shadow-sm transition-transform hover:-translate-y-px"
          >
            <LayoutDashboard :size="15" aria-hidden="true" />
            Acceder a mon espace
          </RouterLink>
        </div>
        <div v-else class="hidden shrink-0 items-center gap-4 lg:flex">
          <RouterLink
            to="/connexion"
            class="relative min-h-0 py-1 text-sm font-semibold text-primaire-contraste/80 transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primaire-contraste/50 after:transition-transform hover:text-primaire-contraste hover:after:scale-x-100"
          >
            Se connecter
          </RouterLink>
          <RouterLink
            to="/inscription"
            class="inline-flex min-h-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-contraste shadow-sm transition-transform hover:-translate-y-px"
          >
            Creer un compte
          </RouterLink>
        </div>

        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primaire-contraste hover:bg-primaire-hover lg:hidden"
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

        <div v-if="auth.estConnecte" class="mt-3 flex gap-2 border-t border-bordure pt-3">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte border border-bordure px-4 py-2.5 text-sm font-semibold text-texte"
            @click="seDeconnecter"
          >
            <LogOut :size="16" aria-hidden="true" />
            Se deconnecter
          </button>
          <RouterLink
            to="/"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte bg-accent px-4 py-2.5 text-sm font-bold text-accent-contraste"
          >
            <LayoutDashboard :size="16" aria-hidden="true" />
            Mon espace
          </RouterLink>
        </div>
        <div v-else class="mt-3 flex gap-2 border-t border-bordure pt-3">
          <RouterLink
            to="/connexion"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte border border-bordure px-4 py-2.5 text-sm font-semibold text-texte"
          >
            <LogIn :size="16" aria-hidden="true" />
            Se connecter
          </RouterLink>
          <RouterLink
            to="/inscription"
            class="flex flex-1 items-center justify-center gap-2 rounded-carte bg-accent px-4 py-2.5 text-sm font-bold text-accent-contraste"
          >
            Creer un compte
          </RouterLink>
        </div>
      </div>
    </header>

    <main id="contenu-principal" class="flex min-h-0 flex-1 flex-col">
      <RouterView />
    </main>

    <VoiceAssistantButton />
    <ChatbotWidget />

    <footer class="border-t border-bordure bg-surface px-4 py-4 pb-20 text-center text-xs text-texte-attenue sm:pb-4">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin ·
      <RouterLink to="/aide" class="underline underline-offset-2 hover:text-texte">Aide</RouterLink>
    </footer>
  </div>
</template>
