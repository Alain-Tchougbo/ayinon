<script setup lang="ts">
import {
  Banknote,
  Bell,
  Calculator,
  ChevronDown,
  Gavel,
  Handshake,
  Landmark,
  Languages,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  Menu,
  Ruler,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
  SunMoon,
  Users,
  Wifi,
  WifiOff,
  X,
} from "@lucide/vue";
import { RoleUtilisateur, type LangueAssistantVocal } from "@ayinon/shared";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantButton from "./components/accessibility/VoiceAssistantButton.vue";
import { useNotifications } from "./composables/useNotifications";
import { useOnlineStatus } from "./composables/useOnlineStatus";
import { useVoiceAssistant } from "./composables/useVoiceAssistant";
import { useAuthStore } from "./stores/auth.store";
import { LANGUES } from "./voice/langues";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { enLigne } = useOnlineStatus();
const { languePreferee, definirLangue } = useVoiceAssistant();
const notifications = useNotifications();

const LIBELLE_ROLE: Record<RoleUtilisateur, string> = {
  CITOYEN: "Citoyen",
  GEOMETRE: "Geometre-expert",
  NOTAIRE: "Notaire",
  MANDATAIRE_FAMILIAL: "Mandataire familial",
  AGENT_ANDF: "Agent ANDF",
  MAGISTRAT_CSAF: "Magistrat CSAF",
  AGENT_BANQUE: "Agent banque",
  ADMIN: "Administrateur",
};

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");
const menuMobileOuvert = ref(false);
const rechercheRapide = ref("");

/** Liens de nav reellement adaptes au role, pas un menu identique pour tout le monde ni un lien unique. */
const liensNav = computed(() => {
  const items: Array<{ to: string; label: string; icone: unknown }> = [{ to: "/carte", label: "Carte cadastrale", icone: Map }];
  if (!auth.estConnecte || auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/scanner", label: "Scanner anti-fraude", icone: ScanLine });
  }
  if (!auth.estConnecte) {
    items.push({ to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator });
  }
  if (auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/passeport-foncier", label: "Passeport foncier", icone: ShieldCheck });
    items.push({ to: "/cession", label: "Ceder un terrain", icone: Handshake });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    items.push({ to: "/famille", label: "Mes mandats", icone: Users });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    items.push({ to: "/geometre", label: "Import de bornage", icone: Ruler });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    items.push({ to: "/andf", label: "Console des poles", icone: Landmark });
    items.push({ to: "/andf/cessions", label: "Cessions a valider", icone: Handshake });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    items.push({ to: "/andf", label: "Console des poles", icone: Landmark });
    items.push({ to: "/csaf", label: "Gel conservatoire", icone: Gavel });
  }
  if (auth.role === RoleUtilisateur.AGENT_BANQUE) {
    items.push({ to: "/banque/solvabilite", label: "Solvabilite", icone: Banknote });
  }
  if (auth.role === RoleUtilisateur.ADMIN) {
    items.push({ to: "/admin", label: "Back-office", icone: LayoutDashboard });
  }
  return items;
});

const initiales = computed(() => {
  const nom = auth.utilisateur?.nomComplet ?? "";
  const parties = nom.trim().split(/\s+/).filter(Boolean);
  return parties.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
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
  notifications.rafraichir();
});

// Recharge le decompte de notifications a chaque connexion/deconnexion et changement de page
// (une action realisee sur une autre page peut avoir fait varier le compteur du role courant).
watch(() => [auth.estConnecte, route.fullPath], () => notifications.rafraichir());

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

function rechercherRapide() {
  const valeur = rechercheRapide.value.trim();
  if (!valeur) return;
  router.push({ name: "carte", query: { nup: valeur } });
  rechercheRapide.value = "";
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-fond text-texte">
    <a href="#contenu-principal" class="lien-evitement">Aller au contenu principal</a>

    <!-- Sidebar desktop : nav verticale, plus aucune contrainte de largeur horizontale a gerer
         role par role (fini les calculs de debordement d'une barre horizontale). -->
    <aside class="hidden w-64 shrink-0 flex-col border-r border-bordure bg-surface lg:flex" aria-label="Navigation principale">
      <RouterLink to="/" class="flex items-center gap-2.5 px-5 py-5 text-base font-bold tracking-tight text-primaire">
        <span class="flex h-9 w-9 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
          <Shield :size="20" :stroke-width="2.25" aria-hidden="true" />
        </span>
        AYINON
      </RouterLink>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <RouterLink
          v-for="lien in liensNav"
          :key="lien.to"
          :to="lien.to"
          class="flex items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue transition-colors hover:bg-fond hover:text-texte"
          active-class="!bg-primaire !text-primaire-contraste"
        >
          <component :is="lien.icone" :size="18" aria-hidden="true" />
          {{ lien.label }}
        </RouterLink>
      </nav>

      <div class="space-y-2 border-t border-bordure px-3 py-4">
        <div class="relative">
          <Languages :size="13" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          <select
            :value="languePreferee"
            aria-label="Langue de l'assistant vocal"
            class="min-h-0 w-full appearance-none rounded-carte border border-bordure bg-fond py-2 pl-8 pr-6 text-xs font-medium text-texte"
            @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
          >
            <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}</option>
          </select>
          <ChevronDown :size="12" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        </div>
        <div class="relative">
          <SunMoon :size="13" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          <select
            v-model="theme"
            aria-label="Theme d'affichage"
            class="min-h-0 w-full appearance-none rounded-carte border border-bordure bg-fond py-2 pl-8 pr-6 text-xs font-medium text-texte"
            @change="appliquerTheme(theme)"
          >
            <option value="clair">Clair</option>
            <option value="sombre">Sombre</option>
            <option value="contraste-eleve">Plein-soleil</option>
          </select>
          <ChevronDown :size="12" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        </div>

        <button
          v-if="auth.estConnecte"
          type="button"
          class="flex w-full items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue transition-colors hover:bg-danger/10 hover:text-danger"
          @click="seDeconnecter"
        >
          <LogOut :size="18" aria-hidden="true" />
          Se deconnecter
        </button>
        <RouterLink
          v-else
          to="/connexion"
          class="flex items-center gap-3 rounded-carte bg-primaire px-3.5 py-2.5 text-sm font-semibold text-primaire-contraste transition-colors hover:bg-primaire-hover"
        >
          <LogIn :size="18" aria-hidden="true" />
          Se connecter
        </RouterLink>
      </div>
    </aside>

    <!-- Tiroir mobile : meme contenu de nav, en superposition. -->
    <div v-if="menuMobileOuvert" class="fixed inset-0 z-40 lg:hidden">
      <div class="absolute inset-0 bg-texte/40" @click="menuMobileOuvert = false" />
      <aside class="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-flottant">
        <div class="flex items-center justify-between px-5 py-4">
          <RouterLink to="/" class="flex items-center gap-2.5 text-base font-bold tracking-tight text-primaire">
            <span class="flex h-9 w-9 items-center justify-center rounded-carte bg-primaire text-primaire-contraste">
              <Shield :size="20" :stroke-width="2.25" aria-hidden="true" />
            </span>
            AYINON
          </RouterLink>
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded-carte text-texte hover:bg-fond" aria-label="Fermer le menu" @click="menuMobileOuvert = false">
            <X :size="20" aria-hidden="true" />
          </button>
        </div>

        <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          <RouterLink
            v-for="lien in liensNav"
            :key="lien.to"
            :to="lien.to"
            class="flex items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue"
            active-class="!bg-primaire !text-primaire-contraste"
          >
            <component :is="lien.icone" :size="18" aria-hidden="true" />
            {{ lien.label }}
          </RouterLink>
        </nav>

        <div class="space-y-2 border-t border-bordure px-3 py-4">
          <div class="relative">
            <Languages :size="13" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="w-full appearance-none rounded-carte border border-bordure bg-fond py-2 pl-8 pr-6 text-xs font-medium text-texte"
              @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
            >
              <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}</option>
            </select>
          </div>
          <div class="relative">
            <SunMoon :size="13" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              v-model="theme"
              aria-label="Theme d'affichage"
              class="w-full appearance-none rounded-carte border border-bordure bg-fond py-2 pl-8 pr-6 text-xs font-medium text-texte"
              @change="appliquerTheme(theme)"
            >
              <option value="clair">Clair</option>
              <option value="sombre">Sombre</option>
              <option value="contraste-eleve">Plein-soleil</option>
            </select>
          </div>
          <button
            v-if="auth.estConnecte"
            type="button"
            class="flex w-full items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue hover:bg-danger/10 hover:text-danger"
            @click="seDeconnecter"
          >
            <LogOut :size="18" aria-hidden="true" />
            Se deconnecter
          </button>
          <RouterLink v-else to="/connexion" class="flex items-center gap-3 rounded-carte bg-primaire px-3.5 py-2.5 text-sm font-semibold text-primaire-contraste">
            <LogIn :size="18" aria-hidden="true" />
            Se connecter
          </RouterLink>
        </div>
      </aside>
    </div>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-bordure bg-surface px-4 py-3 sm:px-6">
        <button
          type="button"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-carte text-texte hover:bg-fond lg:hidden"
          aria-label="Ouvrir le menu"
          @click="menuMobileOuvert = true"
        >
          <Menu :size="20" aria-hidden="true" />
        </button>

        <form class="hidden max-w-sm flex-1 sm:block" @submit.prevent="rechercherRapide">
          <label for="recherche-rapide" class="sr-only">Rechercher une parcelle par NUP</label>
          <div class="relative">
            <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <input
              id="recherche-rapide"
              v-model="rechercheRapide"
              placeholder="Rechercher une parcelle (NUP)…"
              class="w-full rounded-full border border-bordure bg-fond py-2 pl-9 pr-3 text-sm text-texte"
            />
          </div>
        </form>

        <div class="ml-auto flex shrink-0 items-center gap-2">
          <span
            class="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex"
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

          <RouterLink
            v-if="notifications.lien.value"
            :to="notifications.lien.value"
            class="relative flex h-10 w-10 items-center justify-center rounded-full text-texte-attenue hover:bg-fond hover:text-texte"
            :aria-label="`${notifications.compte.value} ${notifications.libelle.value}`"
            :title="`${notifications.compte.value} ${notifications.libelle.value}`"
          >
            <Bell :size="18" aria-hidden="true" />
            <span
              v-if="notifications.compte.value > 0"
              class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.6rem] font-bold text-white"
            >
              {{ notifications.compte.value }}
            </span>
          </RouterLink>

          <div v-if="auth.estConnecte" class="flex items-center gap-2 rounded-full py-1 pl-1 pr-1">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaire text-xs font-bold text-primaire-contraste">
              {{ initiales }}
            </span>
            <div class="hidden leading-tight sm:block">
              <p class="max-w-[9rem] truncate text-xs font-semibold text-texte">{{ auth.utilisateur?.nomComplet }}</p>
              <p class="text-[0.65rem] text-texte-attenue">{{ auth.role ? LIBELLE_ROLE[auth.role] : "" }}</p>
            </div>
          </div>
        </div>
      </header>

      <main id="contenu-principal" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <RouterView />
        <footer class="mt-auto border-t border-bordure bg-surface px-4 py-4 pb-20 text-center text-xs text-texte-attenue sm:pb-4">
          AYINON — Le Gardien Numerique de la Terre · Republique du Benin
        </footer>
      </main>
    </div>

    <VoiceAssistantButton />
  </div>
</template>
