<script setup lang="ts">
import { LogIn, LogOut, Menu, Shield, SunMoon, Wifi, WifiOff, X } from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantBar from "./components/accessibility/VoiceAssistantBar.vue";
import BaseButton from "./components/ui/BaseButton.vue";
import { useOnlineStatus } from "./composables/useOnlineStatus";
import { useAuthStore } from "./stores/auth.store";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { enLigne } = useOnlineStatus();

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

// La nav reflete le meme filtrage par role que les raccourcis de l'accueil personnalise :
// pas de liens citoyens (scanner, simulateur) pour un role professionnel qui n'en a pas l'usage.
const liensRole = computed(() => {
  const liens: Array<{ to: string; label: string }> = [{ to: "/carte", label: "Carte cadastrale" }];

  if (!auth.estConnecte || auth.role === RoleUtilisateur.CITOYEN) {
    liens.push({ to: "/scanner", label: "Scanner anti-fraude" });
    liens.push({ to: "/simulateur-frais", label: "Simulateur de frais" });
  }
  if (auth.role === RoleUtilisateur.CITOYEN) {
    liens.push({ to: "/passeport-foncier", label: "Passeport foncier" });
    liens.push({ to: "/famille", label: "Terre familiale" });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    liens.push({ to: "/famille", label: "Mes mandats familiaux" });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    liens.push({ to: "/geometre", label: "Bornage & chevauchement" });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    liens.push({ to: "/andf", label: "Console des poles" });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    liens.push({ to: "/andf", label: "Console des poles" });
    liens.push({ to: "/csaf", label: "Gel CSAF" });
  }
  return liens;
});

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

        <!-- Ligne unique des lg (>=1024px) : nav + compte tiennent toujours sans retour a la ligne. -->
        <nav class="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm lg:flex" aria-label="Navigation principale">
          <RouterLink
            v-for="lien in liensRole"
            :key="lien.to"
            :to="lien.to"
            class="min-h-0 shrink-0 whitespace-nowrap rounded-carte px-3 py-2 font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
            active-class="!bg-primaire !text-primaire-contraste"
          >
            {{ lien.label }}
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
        <nav class="flex flex-col gap-1" aria-label="Navigation principale (mobile)">
          <RouterLink
            v-for="lien in liensRole"
            :key="lien.to"
            :to="lien.to"
            class="rounded-carte px-3 py-2.5 font-medium text-texte hover:bg-fond"
            active-class="!bg-primaire !text-primaire-contraste"
          >
            {{ lien.label }}
          </RouterLink>
        </nav>

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

    <main id="contenu-principal" class="min-h-0 flex-1">
      <RouterView />
    </main>

    <VoiceAssistantBar />

    <footer class="border-t border-bordure bg-surface py-4 text-center text-xs text-texte-attenue">
      AYINON — Le Gardien Numerique de la Terre · Republique du Benin
    </footer>
  </div>
</template>
