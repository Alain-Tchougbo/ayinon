<script setup lang="ts">
import {
  BadgeCheck,
  Banknote,
  Bell,
  Building,
  Calculator,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleQuestionMark,
  FileStack,
  Flag,
  Gavel,
  Handshake,
  Landmark,
  Languages,
  LayoutDashboard,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Ruler,
  ScanLine,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sprout,
  Store,
  SunMoon,
  TriangleAlert,
  UserRoundSearch,
  Users,
  Wifi,
  WifiOff,
  X,
} from "@lucide/vue";
import { RoleUtilisateur, type LangueAssistantVocal } from "@ayinon/shared";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import VoiceAssistantButton from "../components/accessibility/VoiceAssistantButton.vue";
import ChatbotWidget from "../components/chatbot/ChatbotWidget.vue";
import { useNotifications } from "../composables/useNotifications";
import { useOnlineStatus } from "../composables/useOnlineStatus";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { useAuthStore } from "../stores/auth.store";
import { LIBELLE_ROLE } from "../utils/libellesRoles";
import { LANGUES } from "../voice/langues";

// Habillage "application" (sidebar + en-tete) : ne monte que lorsque auth.estConnecte est true
// (voir App.vue). Un visiteur non connecte voit PublicLayout, jamais ce chrome de tableau de bord.
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { enLigne } = useOnlineStatus();
const { languePreferee, definirLangue } = useVoiceAssistant();
const notifications = useNotifications();

type Theme = "clair" | "sombre" | "contraste-eleve";
const theme = ref<Theme>((localStorage.getItem("ayinon_theme") as Theme | null) ?? "clair");
const menuMobileOuvert = ref(false);
const menuProfilOuvert = ref(false);
const notificationsOuvertes = ref(false);
const rechercheRapide = ref("");
const champRecherche = ref<HTMLInputElement>();

// Reduit la sidebar desktop en mode icones seules ; persiste comme le theme, jamais reinitialise
// silencieusement au rechargement. Le tiroir mobile n'est jamais concerne (toujours plein, on le
// referme entierement plutot que de le reduire).
const sidebarReduite = ref(localStorage.getItem("ayinon_sidebar_reduite") === "true");
function basculerSidebar() {
  sidebarReduite.value = !sidebarReduite.value;
  localStorage.setItem("ayinon_sidebar_reduite", String(sidebarReduite.value));
}

interface LienNav {
  to: string;
  label: string;
  icone: unknown;
  /** Sous-liens (ex. sections du back-office) : rendus comme un menu deroulant plutot qu'un
   * lien direct, pour ne pas eclater la sidebar en une dizaine d'entrees a plat. */
  enfants?: LienNav[];
}
interface GroupeNav {
  titre: string;
  items: LienNav[];
}

const ROLES_AVEC_SIGNALEMENTS: RoleUtilisateur[] = [
  RoleUtilisateur.CITOYEN,
  RoleUtilisateur.VENDEUR,
  RoleUtilisateur.ACHETEUR,
  RoleUtilisateur.MANDATAIRE_FAMILIAL,
];

/** Nav regroupee par domaine (Foncier / Marche / Support), comme dans la DA validee — reellement
 * adaptee au role (chaque lien n'apparait que si le role y a effectivement acces, voir router/index.ts),
 * pas un menu identique pour tout le monde. */
const groupesNav = computed<GroupeNav[]>(() => {
  const foncier: LienNav[] = [{ to: "/carte", label: "Carte cadastrale", icone: Map }];
  const marche: LienNav[] = [{ to: "/annonces", label: "Vitrine des annonces", icone: Store }];
  const support: LienNav[] = [];

  if (auth.role === RoleUtilisateur.CITOYEN) {
    foncier.push({ to: "/passeport-foncier", label: "Passeport foncier", icone: ShieldCheck });
    foncier.push({ to: "/famille", label: "Terre familiale", icone: Users });
    marche.push({ to: "/scanner", label: "Scanner anti-fraude", icone: ScanLine });
    marche.push({ to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator });
  }
  if (auth.role === RoleUtilisateur.VENDEUR) {
    marche.push({ to: "/vendre", label: "Vendre un terrain", icone: Megaphone });
    marche.push({ to: "/scanner", label: "Scanner anti-fraude", icone: ScanLine });
    marche.push({ to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator });
  }
  if (auth.role === RoleUtilisateur.ACHETEUR) {
    marche.push({ to: "/acheter", label: "Acheter un terrain", icone: Handshake });
    marche.push({ to: "/scanner", label: "Scanner anti-fraude", icone: ScanLine });
    marche.push({ to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    foncier.push({ to: "/famille", label: "Mes mandats", icone: Users });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    foncier.push({ to: "/geometre", label: "Import de bornage", icone: Ruler });
    foncier.push({ to: "/geometre/batis", label: "Validation des batis", icone: Building });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    foncier.push({ to: "/andf", label: "Console des poles", icone: Landmark });
    foncier.push({ to: "/andf/cessions", label: "Cessions a valider", icone: Handshake });
    foncier.push({ to: "/geometre/batis", label: "Validation des batis", icone: Building });
    foncier.push({ to: "/andf/usage-sol", label: "Usage du sol", icone: Sprout });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    foncier.push({ to: "/andf", label: "Console des poles", icone: Landmark });
    foncier.push({ to: "/csaf", label: "Gel conservatoire", icone: Gavel });
  }
  if (auth.role === RoleUtilisateur.AGENT_BANQUE) {
    marche.push({ to: "/banque/solvabilite", label: "Solvabilite", icone: Banknote });
  }

  if (auth.role && ROLES_AVEC_SIGNALEMENTS.includes(auth.role)) {
    support.push({ to: "/mes-signalements", label: "Mes signalements", icone: ScrollText });
  }
  support.push({ to: "/aide", label: "Aide", icone: CircleQuestionMark });
  if (auth.role === RoleUtilisateur.ADMIN) {
    support.push({
      to: "/admin",
      label: "Back-office",
      icone: LayoutDashboard,
      enfants: [
        { to: "/admin", label: "Vue d'ensemble", icone: LayoutDashboard },
        { to: "/admin/demandes-professionnelles", label: "Demandes professionnelles", icone: BadgeCheck },
        { to: "/admin/utilisateurs", label: "Utilisateurs", icone: Users },
        { to: "/admin/proprietaires", label: "Proprietaires", icone: UserRoundSearch },
        { to: "/admin/parcelles", label: "Parcelles", icone: Map },
        { to: "/admin/documents", label: "Documents", icone: FileStack },
        { to: "/admin/signalements", label: "Signalements", icone: Flag },
        { to: "/admin/annonces-a-risque", label: "Annonces a risque", icone: TriangleAlert },
      ],
    });
  }

  return [
    { titre: "Foncier", items: foncier },
    { titre: "Marche", items: marche },
    { titre: "Support", items: support },
  ];
});

// Le titre de route "/" ("Accueil") sert aussi a l'experience publique anonyme (voir PublicLayout) ;
// dans ce shell tableau de bord (uniquement monte connecte), la meme page est le tableau de bord.
const titrePage = computed(() => (route.name === "accueil" ? "Tableau de bord" : route.meta.titre));

// Sous-menu deroulant de la sidebar (ex. Back-office) : replie par defaut, deplie manuellement ou
// automatiquement des que la page active en fait partie (voir estSousMenuOuvert).
const sousMenusOuvertsManuel = ref<Set<string>>(new Set());
function basculerSousMenu(to: string) {
  const nouveaux = new Set(sousMenusOuvertsManuel.value);
  if (nouveaux.has(to)) nouveaux.delete(to);
  else nouveaux.add(to);
  sousMenusOuvertsManuel.value = nouveaux;
}
function estSousMenuOuvert(lien: LienNav): boolean {
  if (sousMenusOuvertsManuel.value.has(lien.to)) return true;
  return lien.enfants?.some((enfant) => route.path === enfant.to) ?? false;
}

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
    <aside
      class="hidden shrink-0 flex-col bg-primaire transition-[width] duration-150 lg:flex"
      :class="sidebarReduite ? 'w-[4.5rem]' : 'w-64'"
      aria-label="Navigation principale"
    >
      <RouterLink
        to="/public"
        class="flex h-16 shrink-0 items-center gap-2.5 border-b border-primaire-contraste/10 text-base font-bold tracking-tight text-primaire-contraste"
        :class="sidebarReduite ? 'justify-center px-0' : 'px-5'"
      >
        <Shield :size="22" :stroke-width="2.25" class="shrink-0 text-accent" aria-hidden="true" />
        <span v-if="!sidebarReduite">AYINON</span>
      </RouterLink>

      <nav class="flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div>
          <p v-if="!sidebarReduite" class="px-3.5 pb-1 text-[0.68rem] font-bold uppercase tracking-wider text-primaire-contraste/45">Pilotage</p>
          <RouterLink
            to="/"
            class="flex items-center gap-3 border-l-2 border-transparent py-2.5 text-sm font-semibold text-primaire-contraste/70 transition-colors hover:bg-primaire-contraste/5 hover:text-primaire-contraste"
            :class="sidebarReduite ? 'justify-center px-0' : 'px-3'"
            exact-active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
            :title="sidebarReduite ? 'Tableau de bord' : undefined"
          >
            <LayoutDashboard :size="18" class="shrink-0" aria-hidden="true" />
            <span v-if="!sidebarReduite">Tableau de bord</span>
          </RouterLink>
        </div>
        <div v-for="groupe in groupesNav" :key="groupe.titre">
          <p v-if="!sidebarReduite" class="px-3.5 pb-1 text-[0.68rem] font-bold uppercase tracking-wider text-primaire-contraste/45">{{ groupe.titre }}</p>
          <template v-for="lien in groupe.items" :key="lien.to">
            <!-- Sous-menu deroulant (ex. Back-office) : replie par defaut, deplie automatiquement
                 si la page actuelle en fait partie. Ignore en mode sidebar reduite (pas de place
                 pour une liste de sous-liens) : mene alors directement a la page racine. -->
            <template v-if="lien.enfants && !sidebarReduite">
              <button
                type="button"
                class="flex w-full items-center gap-3 border-l-2 border-transparent py-2.5 pr-3 text-sm font-semibold text-primaire-contraste/70 transition-colors hover:bg-primaire-contraste/5 hover:text-primaire-contraste"
                :class="[sidebarReduite ? 'justify-center px-0' : 'px-3', estSousMenuOuvert(lien) && '!text-primaire-contraste']"
                @click="basculerSousMenu(lien.to)"
              >
                <component :is="lien.icone" :size="18" class="shrink-0" aria-hidden="true" />
                <span class="flex-1 text-left">{{ lien.label }}</span>
                <ChevronRight :size="14" class="shrink-0 transition-transform" :class="estSousMenuOuvert(lien) && 'rotate-90'" aria-hidden="true" />
              </button>
              <div v-if="estSousMenuOuvert(lien)" class="space-y-0.5 py-0.5">
                <RouterLink
                  v-for="enfant in lien.enfants"
                  :key="enfant.to"
                  :to="enfant.to"
                  class="flex items-center gap-3 border-l-2 border-transparent py-2 pl-8 pr-3 text-sm text-primaire-contraste/60 transition-colors hover:bg-primaire-contraste/5 hover:text-primaire-contraste"
                  active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
                  exact-active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
                >
                  <component :is="enfant.icone" :size="15" class="shrink-0" aria-hidden="true" />
                  <span>{{ enfant.label }}</span>
                </RouterLink>
              </div>
            </template>
            <RouterLink
              v-else
              :to="lien.to"
              class="flex items-center gap-3 border-l-2 border-transparent py-2.5 text-sm font-semibold text-primaire-contraste/70 transition-colors hover:bg-primaire-contraste/5 hover:text-primaire-contraste"
              :class="sidebarReduite ? 'justify-center px-0' : 'px-3'"
              active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
              :title="sidebarReduite ? lien.label : undefined"
            >
              <component :is="lien.icone" :size="18" class="shrink-0" aria-hidden="true" />
              <span v-if="!sidebarReduite">{{ lien.label }}</span>
            </RouterLink>
          </template>
        </div>
      </nav>

      <div class="space-y-2 border-t border-primaire-contraste/10 px-3 py-3">
        <button
          type="button"
          class="flex w-full items-center gap-3 py-2 text-sm font-semibold text-primaire-contraste/70 transition-colors hover:bg-primaire-contraste/5 hover:text-primaire-contraste"
          :class="sidebarReduite ? 'justify-center px-0' : 'px-3.5'"
          :title="sidebarReduite ? 'Agrandir le menu' : 'Reduire le menu'"
          @click="basculerSidebar"
        >
          <ChevronsRight v-if="sidebarReduite" :size="18" class="shrink-0" aria-hidden="true" />
          <ChevronsLeft v-else :size="18" class="shrink-0" aria-hidden="true" />
          <span v-if="!sidebarReduite">Reduire</span>
        </button>

        <div class="flex items-center gap-2.5 px-1 py-1" :class="sidebarReduite ? 'justify-center' : ''">
          <span
            class="flex h-[2.15rem] w-[2.15rem] shrink-0 items-center justify-center rounded-full border border-primaire-contraste/20 bg-primaire-contraste/10 text-xs font-bold text-primaire-contraste"
          >
            {{ initiales }}
          </span>
          <div v-if="!sidebarReduite" class="min-w-0 leading-tight">
            <p class="truncate text-sm font-bold text-primaire-contraste">{{ auth.utilisateur?.nomComplet }}</p>
            <p class="text-xs text-primaire-contraste/60">{{ auth.role ? LIBELLE_ROLE[auth.role] : "" }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Tiroir mobile : meme contenu de nav, en superposition. -->
    <div v-if="menuMobileOuvert" class="fixed inset-0 z-40 lg:hidden">
      <div class="absolute inset-0 bg-texte/40" @click="menuMobileOuvert = false" />
      <aside class="relative flex h-full w-72 max-w-[85vw] flex-col bg-primaire shadow-flottant">
        <div class="flex items-center justify-between px-5 py-4">
          <RouterLink to="/public" class="flex items-center gap-2.5 text-base font-bold tracking-tight text-primaire-contraste">
            <Shield :size="22" :stroke-width="2.25" class="text-accent" aria-hidden="true" />
            AYINON
          </RouterLink>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-carte text-primaire-contraste hover:bg-primaire-contraste/10"
            aria-label="Fermer le menu"
            @click="menuMobileOuvert = false"
          >
            <X :size="20" aria-hidden="true" />
          </button>
        </div>

        <nav class="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          <div>
            <p class="px-3.5 pb-1 text-[0.68rem] font-bold uppercase tracking-wider text-primaire-contraste/45">Pilotage</p>
            <RouterLink
              to="/"
              class="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-primaire-contraste/70"
              exact-active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
            >
              <LayoutDashboard :size="18" aria-hidden="true" />
              Tableau de bord
            </RouterLink>
          </div>
          <div v-for="groupe in groupesNav" :key="groupe.titre">
            <p class="px-3.5 pb-1 text-[0.68rem] font-bold uppercase tracking-wider text-primaire-contraste/45">{{ groupe.titre }}</p>
            <template v-for="lien in groupe.items" :key="lien.to">
              <template v-if="lien.enfants">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-primaire-contraste/70"
                  @click="basculerSousMenu(lien.to)"
                >
                  <component :is="lien.icone" :size="18" class="shrink-0" aria-hidden="true" />
                  <span class="flex-1 text-left">{{ lien.label }}</span>
                  <ChevronRight :size="14" class="shrink-0 transition-transform" :class="estSousMenuOuvert(lien) && 'rotate-90'" aria-hidden="true" />
                </button>
                <div v-if="estSousMenuOuvert(lien)" class="space-y-0.5 py-0.5">
                  <RouterLink
                    v-for="enfant in lien.enfants"
                    :key="enfant.to"
                    :to="enfant.to"
                    class="flex items-center gap-3 border-l-2 border-transparent py-2 pl-8 pr-3 text-sm text-primaire-contraste/60"
                    active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
                    exact-active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
                  >
                    <component :is="enfant.icone" :size="15" class="shrink-0" aria-hidden="true" />
                    <span>{{ enfant.label }}</span>
                  </RouterLink>
                </div>
              </template>
              <RouterLink
                v-else
                :to="lien.to"
                class="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-primaire-contraste/70"
                active-class="!border-accent !bg-primaire-contraste/10 !text-primaire-contraste"
              >
                <component :is="lien.icone" :size="18" aria-hidden="true" />
                {{ lien.label }}
              </RouterLink>
            </template>
          </div>
        </nav>

        <div class="space-y-2 border-t border-primaire-contraste/10 px-3 py-4">
          <div class="relative">
            <Languages :size="13" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
            <select
              :value="languePreferee"
              aria-label="Langue de l'assistant vocal"
              class="w-full appearance-none rounded-carte border border-bordure bg-surface py-2 pl-8 pr-6 text-xs font-medium text-texte"
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
              class="w-full appearance-none rounded-carte border border-bordure bg-surface py-2 pl-8 pr-6 text-xs font-medium text-texte"
              @change="appliquerTheme(theme)"
            >
              <option value="clair">Clair</option>
              <option value="sombre">Sombre</option>
              <option value="contraste-eleve">Plein-soleil</option>
            </select>
          </div>
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-primaire-contraste/70 hover:bg-primaire-contraste/10 hover:text-primaire-contraste"
            @click="seDeconnecter"
          >
            <LogOut :size="18" aria-hidden="true" />
            Se deconnecter
          </button>
        </div>
      </aside>
    </div>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header class="flex h-16 shrink-0 items-center gap-4 border-b border-bordure bg-surface px-4 sm:px-6">
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-carte text-texte hover:bg-fond lg:hidden"
          aria-label="Ouvrir le menu"
          @click="menuMobileOuvert = true"
        >
          <Menu :size="20" aria-hidden="true" />
        </button>

        <p class="hidden shrink-0 truncate text-sm font-bold text-texte lg:block">{{ titrePage }}</p>

        <form class="hidden max-w-sm flex-1 sm:block" @submit.prevent="rechercherRapide">
          <label for="recherche-rapide" class="sr-only">Rechercher une parcelle par NUP</label>
          <div class="relative flex h-11 items-center">
            <Search :size="16" class="pointer-events-none absolute left-3.5 text-texte-attenue" aria-hidden="true" />
            <input
              id="recherche-rapide"
              ref="champRecherche"
              v-model="rechercheRapide"
              placeholder="Rechercher une parcelle (NUP)…"
              class="h-11 w-full rounded-full border border-bordure bg-surface pl-9 pr-14 text-sm text-texte"
            />
            <kbd
              class="pointer-events-none absolute right-2.5 rounded border border-bordure bg-fond px-1.5 py-1 text-[0.65rem] font-semibold leading-none text-texte-attenue"
            >
              Ctrl K
            </kbd>
          </div>
        </form>

        <div class="ml-auto flex shrink-0 items-center">
          <div class="mr-3 hidden items-center divide-x divide-bordure overflow-hidden rounded-carte border border-bordure sm:flex">
            <span
              class="flex h-11 items-center gap-1.5 px-3 text-xs font-semibold"
              :class="enLigne ? 'text-succes' : 'text-danger'"
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
            <div class="relative flex items-center">
              <Languages :size="13" class="pointer-events-none absolute left-3 text-texte-attenue" aria-hidden="true" />
              <select
                :value="languePreferee"
                aria-label="Langue de l'assistant vocal"
                class="h-11 min-h-0 appearance-none bg-transparent pl-8 pr-6 text-xs font-semibold text-texte-attenue"
                @change="definirLangue(($event.target as HTMLSelectElement).value as LangueAssistantVocal)"
              >
                <option v-for="l in LANGUES" :key="l.valeur" :value="l.valeur">{{ l.label }}{{ l.audioDisponible ? "" : " (bientot)" }}</option>
              </select>
              <ChevronDown :size="12" class="pointer-events-none absolute right-2 text-texte-attenue" aria-hidden="true" />
            </div>
            <div class="relative flex items-center">
              <SunMoon :size="13" class="pointer-events-none absolute left-3 text-texte-attenue" aria-hidden="true" />
              <select
                v-model="theme"
                aria-label="Theme d'affichage"
                class="h-11 min-h-0 appearance-none bg-transparent pl-8 pr-6 text-xs font-semibold text-texte-attenue"
                @change="appliquerTheme(theme)"
              >
                <option value="clair">Clair</option>
                <option value="sombre">Sombre</option>
                <option value="contraste-eleve">Plein-soleil</option>
              </select>
              <ChevronDown :size="12" class="pointer-events-none absolute right-2 text-texte-attenue" aria-hidden="true" />
            </div>
          </div>

          <div class="relative flex items-center gap-1 border-r border-bordure pr-3">
            <div v-if="notificationsOuvertes" class="fixed inset-0 z-10" @click="notificationsOuvertes = false" />
            <button
              type="button"
              class="relative z-20 flex h-11 w-11 items-center justify-center rounded-full text-texte-attenue hover:bg-fond hover:text-texte"
              :aria-expanded="notificationsOuvertes"
              aria-haspopup="true"
              :aria-label="`${notifications.items.value.length} notification(s)`"
              :title="`${notifications.items.value.length} notification(s)`"
              @click="notificationsOuvertes = !notificationsOuvertes"
            >
              <Bell :size="18" aria-hidden="true" />
              <span
                v-if="notifications.items.value.length > 0"
                class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.6rem] font-bold text-white"
              >
                {{ notifications.items.value.length }}
              </span>
            </button>

            <div
              v-if="notificationsOuvertes"
              class="absolute right-0 top-full z-20 mt-2 w-80 max-w-[90vw] rounded-carte border border-bordure bg-surface shadow-flottant"
            >
              <div class="border-b border-bordure px-4 py-3">
                <p class="font-semibold text-texte">Notifications</p>
              </div>
              <div class="max-h-96 overflow-y-auto">
                <p v-if="notifications.items.value.length === 0" class="px-4 py-6 text-center text-sm text-texte-attenue">
                  Aucune notification pour le moment.
                </p>
                <ul v-else class="divide-y divide-bordure">
                  <li v-for="item in notifications.items.value" :key="item.id">
                    <RouterLink :to="item.lien" class="block px-4 py-2.5 hover:bg-fond" @click="notificationsOuvertes = false">
                      <p class="text-sm font-medium text-texte">{{ item.titre }}</p>
                      <p class="text-xs text-texte-attenue">{{ item.sousTitre }}</p>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="relative ml-3">
            <div v-if="menuProfilOuvert" class="fixed inset-0 z-10" @click="menuProfilOuvert = false" />
            <button
              type="button"
              class="relative z-20 flex h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-fond"
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
          AYINON — Le Gardien Numerique de la Terre · Republique du Benin ·
          <RouterLink to="/aide" class="underline underline-offset-2 hover:text-texte">Aide</RouterLink>
        </footer>
      </main>
    </div>

    <VoiceAssistantButton />
    <ChatbotWidget />
  </div>
</template>
