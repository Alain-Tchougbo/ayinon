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
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantButton from "../components/accessibility/VoiceAssistantButton.vue";
import { useNotifications } from "../composables/useNotifications";
import { useOnlineStatus } from "../composables/useOnlineStatus";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useAuthStore } from "../stores/auth.store";
import { LANGUES } from "../voice/langues";

// Habillage "application" (sidebar + en-tete) : ne monte que lorsque auth.estConnecte est true
// (voir App.vue). Un visiteur non connecte voit PublicLayout, jamais ce chrome de tableau de bord.
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
const menuProfilOuvert = ref(false);
const rechercheRapide = ref("");
const champRecherche = ref<HTMLInputElement>();

/** Liens de nav reellement adaptes au role, pas un menu identique pour tout le monde. */
const liensNav = computed(() => {
  const items: Array<{ to: string; label: string; icone: unknown }> = [{ to: "/carte", label: "Carte cadastrale", icone: Map }];
  if (auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/scanner", label: "Scanner anti-fraude", icone: ScanLine });
    items.push({ to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator });
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
  return (
    parties
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
});

function appliquerTheme(nouveau: Theme) {
  theme.value = nouveau;
  localStorage.setItem("ayinon_theme", nouveau);
  document.documentElement.setAttribute("data-theme", nouveau);
}

// Raccourci clavier reel (Ctrl/Cmd+K) pour rejoindre la recherche rapide, comme son indice visuel
// dans l'en-tete le promet — jamais un badge decoratif qui ne ferait rien au clavier.
function surRaccourciClavier(evenement: KeyboardEvent) {
  if ((evenement.ctrlKey || evenement.metaKey) && evenement.key.toLowerCase() === "k") {
    evenement.preventDefault();
    champRecherche.value?.focus();
  }
}

onMounted(() => {
  appliquerTheme(theme.value);
  notifications.rafraichir();
  window.addEventListener("keydown", surRaccourciClavier);
});
onBeforeUnmount(() => window.removeEventListener("keydown", surRaccourciClavier));

// Recharge le decompte de notifications a chaque changement de page (une action realisee sur une
// autre page peut avoir fait varier le compteur du role courant).
watch(() => route.fullPath, () => notifications.rafraichir());
watch(() => route.fullPath, () => {
  menuMobileOuvert.value = false;
  menuProfilOuvert.value = false;
});

// Filet de securite reactif : si la session est perdue (deconnexion, expiration) pendant qu'on est
// sur une page protegee, on sort immediatement de ce layout vers la connexion plutot que de rester
// affiche sous un chrome "tableau de bord" qui n'a plus de session valide.
watch(
  () => auth.estConnecte,
  (connecte) => {
    if (!connecte) {
      router.push({ name: "connexion", query: route.meta.necessiteAuth ? { redirection: route.fullPath } : undefined });
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
          type="button"
          class="flex w-full items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue transition-colors hover:bg-danger/10 hover:text-danger"
          @click="seDeconnecter"
        >
          <LogOut :size="18" aria-hidden="true" />
          Se deconnecter
        </button>
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
            type="button"
            class="flex w-full items-center gap-3 rounded-carte px-3.5 py-2.5 text-sm font-medium text-texte-attenue hover:bg-danger/10 hover:text-danger"
            @click="seDeconnecter"
          >
            <LogOut :size="18" aria-hidden="true" />
            Se deconnecter
          </button>
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
              ref="champRecherche"
              v-model="rechercheRapide"
              placeholder="Rechercher une parcelle (NUP)…"
              class="w-full rounded-full border border-bordure bg-fond py-2 pl-9 pr-14 text-sm text-texte"
            />
            <kbd
              class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-bordure bg-surface px-1.5 py-0.5 text-[0.65rem] font-semibold text-texte-attenue"
            >
              Ctrl K
            </kbd>
          </div>
        </form>

        <div class="ml-auto flex shrink-0 items-center gap-1">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-full"
            :class="enLigne ? 'text-succes' : 'text-danger'"
            :title="
              enLigne
                ? 'Connexion active : vos actions sont enregistrees immediatement.'
                : 'Hors-ligne : vos actions sont mises en file et synchronisees au retour du reseau.'
            "
          >
            <Wifi v-if="enLigne" :size="18" aria-hidden="true" />
            <WifiOff v-else :size="18" aria-hidden="true" />
            <span class="sr-only">{{ enLigne ? "En ligne" : "Hors-ligne" }}</span>
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

          <div class="relative">
            <div v-if="menuProfilOuvert" class="fixed inset-0 z-10" @click="menuProfilOuvert = false" />
            <button
              type="button"
              class="relative z-20 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-fond"
              :aria-expanded="menuProfilOuvert"
              aria-haspopup="true"
              @click="menuProfilOuvert = !menuProfilOuvert"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primaire text-xs font-bold text-primaire-contraste">
                {{ initiales }}
              </span>
              <div class="hidden leading-tight sm:block">
                <p class="max-w-[9rem] truncate text-left text-xs font-semibold text-texte">{{ auth.utilisateur?.nomComplet }}</p>
                <p class="text-left text-[0.65rem] text-texte-attenue">{{ auth.role ? LIBELLE_ROLE[auth.role] : "" }}</p>
              </div>
              <ChevronDown :size="14" class="hidden shrink-0 text-texte-attenue sm:block" aria-hidden="true" />
            </button>

            <div v-if="menuProfilOuvert" class="absolute right-0 top-full z-20 mt-2 w-48 rounded-carte border border-bordure bg-surface py-1.5 shadow-flottant">
              <button
                type="button"
                class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-texte-attenue hover:bg-danger/10 hover:text-danger"
                @click="seDeconnecter"
              >
                <LogOut :size="16" aria-hidden="true" />
                Se deconnecter
              </button>
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
