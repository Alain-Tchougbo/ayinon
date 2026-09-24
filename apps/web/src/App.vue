<script setup lang="ts">
import { ChevronDown, Languages, LogIn, LogOut, Menu, Shield, SunMoon, Wifi, WifiOff, X } from "@lucide/vue";
import { RoleUtilisateur, type LangueAssistantVocal } from "@ayinon/shared";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantButton from "./components/accessibility/VoiceAssistantButton.vue";
import BaseButton from "./components/ui/BaseButton.vue";
import { useOnlineStatus } from "./composables/useOnlineStatus";
import { useVoiceAssistant } from "./composables/useVoiceAssistant";
import { useAuthStore } from "./stores/auth.store";
import { LANGUES } from "./voice/langues";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { enLigne } = useOnlineStatus();
const { languePreferee, definirLangue } = useVoiceAssistant();

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");
const menuMobileOuvert = ref(false);

/** Liens de nav reellement adaptes au role, pas un menu identique pour tout le monde ni un lien unique. */
const liensNav = computed(() => {
  const items: Array<{ to: string; label: string }> = [{ to: "/carte", label: "Carte cadastrale" }];
  if (!auth.estConnecte || auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/scanner", label: "Scanner" });
  }
  if (!auth.estConnecte) {
    items.push({ to: "/simulateur-frais", label: "Simulateur" });
  }
  if (auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/passeport-foncier", label: "Passeport foncier" });
    items.push({ to: "/cession", label: "Ceder un terrain" });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    items.push({ to: "/famille", label: "Mes mandats" });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    items.push({ to: "/geometre", label: "Import de bornage" });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    items.push({ to: "/andf", label: "Console des poles" });
    items.push({ to: "/andf/cessions", label: "Cessions" });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    items.push({ to: "/andf", label: "Console des poles" });
    items.push({ to: "/csaf", label: "Gel conservatoire" });
  }
  if (auth.role === RoleUtilisateur.AGENT_BANQUE) {
    items.push({ to: "/banque/solvabilite", label: "Solvabilite" });
  }
  if (auth.role === RoleUtilisateur.ADMIN) {
    items.push({ to: "/admin", label: "Back-office" });
  }
  return items;
});

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

// Filet de securite reactif : si la session est perdue (deconnexion, expiration) pendant qu'on est
// deja sur une page protegee, l'en-tete se met a jour immediatement (reactif) mais la navigation vers
// une page publique peut prendre un instant, laissant transitoirement le contenu protege affiche sous
// un en-tete "deconnecte". On force ici la sortie de toute route necessitant une authentification des
// que la session tombe, sans attendre un appel explicite a router.push ailleurs.
watch(
  () => auth.estConnecte,
  (connecte) => {
    if (!connecte && route.meta.necessiteAuth) {
      router.push({ name: "connexion", query: { redirection: route.fullPath } });
    }
  },
);

async function seDeconnecter() {
  await auth.deconnexion();
  router.push({ name: "accueil" });
}
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

        <!-- Liens reellement adaptes au role connecte (voir liensNav), pas un menu generique identique pour tous. -->
        <nav class="hidden items-center gap-0.5 xl:flex" aria-label="Navigation principale">
          <RouterLink
            v-for="lien in liensNav"
            :key="lien.to"
            :to="lien.to"
            class="min-h-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
            active-class="!bg-primaire/10 !text-primaire !font-semibold"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>

        <div class="hidden shrink-0 items-center gap-1 xl:flex">
          <span
            class="mr-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="enLigne ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'"
            :title="
              enLigne
                ? 'Connexion active : vos actions sont enregistrees immediatement.'
                : 'Hors-ligne : vos actions sont mises en file et synchronisees au retour du reseau.'
            "
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

          <template v-if="auth.estConnecte">
            <span class="ml-2 max-w-[9rem] truncate text-sm text-texte-attenue">{{ auth.utilisateur?.nomComplet }}</span>
            <button
              type="button"
              class="ml-2 inline-flex min-h-0 items-center gap-1.5 rounded-full bg-primaire/10 px-4 py-2 text-sm font-semibold text-primaire transition-colors hover:bg-primaire/15"
              @click="seDeconnecter"
            >
              <LogOut :size="14" aria-hidden="true" />
              Se deconnecter
            </button>
          </template>
          <RouterLink
            v-else
            to="/connexion"
            class="ml-2 inline-flex min-h-0 items-center gap-1.5 rounded-full bg-primaire px-5 py-2 text-sm font-semibold text-primaire-contraste shadow-sm transition-colors hover:bg-primaire-hover"
          >
            <LogIn :size="14" aria-hidden="true" />
            Se connecter
          </RouterLink>
        </div>

        <!-- Sous xl : bouton hamburger unique, tout le reste passe dans le panneau deplie ci-dessous. -->
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texte hover:bg-fond xl:hidden"
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
        class="mx-auto mt-2 max-w-7xl rounded-carte border border-bordure bg-surface px-4 py-3 shadow-flottant xl:hidden"
      >
        <RouterLink
          v-for="lien in liensNav"
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

    <VoiceAssistantButton />

    <footer class="border-t border-bordure bg-surface px-4 py-4 pb-20 text-center text-xs text-texte-attenue sm:pb-4">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin
    </footer>
  </div>
</template>
