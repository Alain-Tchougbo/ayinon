<script setup lang="ts">
import {
  Award,
  Banknote,
  Bell,
  Calculator,
  ChevronRight,
  CircleCheck,
  Clock,
  Gavel,
  Handshake,
  Inbox,
  Landmark,
  LayoutDashboard,
  ListClock,
  Map,
  Megaphone,
  Ruler,
  ScanLine,
  ScrollText,
  Search,
  ShieldCheck,
  Store,
  TriangleAlert,
  Users,
} from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import HeroCarteBenin from "../components/accueil/HeroCarteBenin.vue";
import BaseButton from "../components/ui/BaseButton.vue";
import BaseCard from "../components/ui/BaseCard.vue";
import { useNotifications } from "../composables/useNotifications";
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth.store";
import { useParcellesStore } from "../stores/parcelles.store";
import { LIBELLE_ROLE } from "../utils/libellesRoles";
import { PHRASES } from "../voice/phrases";

interface SignatureEnAttente {
  id: string;
  role: string;
  parcelle: { id: string; nup: string; commune: string };
}
interface MonImport {
  id: string;
  referenceDossier: string;
  chevauchementDetecte: boolean;
  signeParId: string | null;
  createdAt: string;
  parcelle: { nup: string; commune: string };
}
interface ConflitCsaf {
  id: string;
  motif: string;
  dateGel: string;
  parcelle: { nup: string; commune: string };
}
interface AnnonceAvecInterets {
  id: string;
  statut: "ACTIVE" | "RETIREE" | "VENDUE";
  parcelle: { nup: string; commune: string };
  interets: Array<{ statut: string }>;
}
interface InteretExprime {
  id: string;
  statut: "EN_ATTENTE" | "RETENU" | "DECLINE";
  annonce: { id: string; parcelle: { nup: string; commune: string } };
}
interface PropositionCession {
  id: string;
  vendeurNom: string;
  montantFcfa: number;
  parcelle: { id: string; nup: string; commune: string };
}
interface MonSignalementApercu {
  id: string;
  statut: "DEPOSE" | "FONDE" | "REJETE";
  motif: string;
  createdAt: string;
  traiteLe: string | null;
  parcelle: { nup: string };
}
interface RechercheSauvegardeeApercu {
  id: string;
  nom: string;
  nombreNouvelles: number;
}

const router = useRouter();
const auth = useAuthStore();
const { definirPhraseCourante } = useVoiceAssistant();
const parcelles = useParcellesStore();
const notifications = useNotifications();
const nup = ref("");

const mesSignatures = ref<SignatureEnAttente[]>([]);
const mesImports = ref<MonImport[]>([]);
const conflitsActifs = ref<ConflitCsaf[]>([]);
const mesAnnonces = ref<AnnonceAvecInterets[]>([]);
const mesInterets = ref<InteretExprime[]>([]);
const propositionsCession = ref<PropositionCession[]>([]);
const mesSignalements = ref<MonSignalementApercu[]>([]);
const mesRecherchesSauvegardees = ref<RechercheSauvegardeeApercu[]>([]);
const chargementEspace = ref(false);

const mesParcelles = computed(() => parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId));

const dateAujourdhui = computed(() =>
  new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
);
const libelleRoleActuel = computed(() => (auth.role ? LIBELLE_ROLE[auth.role] : ""));
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

onMounted(async () => {
  definirPhraseCourante(PHRASES.bienvenue);
  if (!auth.estConnecte) return;
  chargerNotificationsLues();
  notifications.rafraichir();
  chargementEspace.value = true;
  try {
    if (auth.role === RoleUtilisateur.CITOYEN) {
      const [, signalements] = await Promise.all([
        parcelles.chargerToutes(),
        api.get<MonSignalementApercu[]>("/signalements/mes-signalements"),
      ]);
      mesSignalements.value = signalements;
    } else if (auth.role === RoleUtilisateur.VENDEUR) {
      mesAnnonces.value = await api.get<AnnonceAvecInterets[]>("/annonces/mes-annonces");
    } else if (auth.role === RoleUtilisateur.ACHETEUR) {
      [mesInterets.value, propositionsCession.value, mesRecherchesSauvegardees.value] = await Promise.all([
        api.get<InteretExprime[]>("/annonces/mes-interets"),
        api.get<PropositionCession[]>("/cessions/mes-propositions-recues"),
        api.get<RechercheSauvegardeeApercu[]>("/recherches-sauvegardees"),
      ]);
    } else if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
      mesSignatures.value = await api.get<SignatureEnAttente[]>("/familles/mes-signatures-en-attente");
    } else if (auth.role === RoleUtilisateur.GEOMETRE) {
      mesImports.value = await api.get<MonImport[]>("/geometre/mes-imports");
    } else if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
      conflitsActifs.value = await api.get<ConflitCsaf[]>("/csaf/conflits-actifs");
    }
  } finally {
    chargementEspace.value = false;
  }
});

function rechercherEtOuvrirCarte() {
  const valeur = nup.value.trim();
  router.push({ name: "carte", query: valeur ? { nup: valeur } : undefined });
}

interface StatAffichee {
  icone: unknown;
  label: string;
  valeur: string | number;
  sousTexte?: string;
}

/** Statistiques reelles de la banniere : toujours derivees des donnees deja chargees pour ce role,
 * jamais un chiffre invente ou decoratif. */
const statistiques = computed<StatAffichee[]>(() => {
  if (auth.role === RoleUtilisateur.CITOYEN) {
    const total = mesParcelles.value.length;
    const verrouillees = mesParcelles.value.filter((p) => p.verrouAntiVente).length;
    const titrees = mesParcelles.value.filter((p) => p.statut === "TITREE").length;
    const enAttente = mesSignalements.value.filter((s) => s.statut === "DEPOSE").length;
    return [
      { icone: Map, label: "Mes parcelles", valeur: total },
      { icone: ShieldCheck, label: "Verrouillees", valeur: verrouillees, sousTexte: `sur ${total} parcelle(s)` },
      { icone: CircleCheck, label: "Parcelles titrees", valeur: titrees },
      {
        icone: ScrollText,
        label: "Mes signalements",
        valeur: mesSignalements.value.length,
        sousTexte: enAttente > 0 ? `${enAttente} en attente d'examen` : undefined,
      },
    ];
  }
  if (auth.role === RoleUtilisateur.VENDEUR) {
    const actives = mesAnnonces.value.filter((a) => a.statut === "ACTIVE").length;
    const vendues = mesAnnonces.value.filter((a) => a.statut === "VENDUE").length;
    const interetsEnAttente = mesAnnonces.value.reduce(
      (total, a) => total + a.interets.filter((i) => i.statut === "EN_ATTENTE").length,
      0,
    );
    return [
      { icone: Megaphone, label: "Annonces publiees", valeur: mesAnnonces.value.length },
      { icone: Store, label: "Annonces actives", valeur: actives },
      { icone: Inbox, label: "Interets en attente", valeur: interetsEnAttente },
      { icone: CircleCheck, label: "Ventes conclues", valeur: vendues },
    ];
  }
  if (auth.role === RoleUtilisateur.ACHETEUR) {
    const retenus = mesInterets.value.filter((i) => i.statut === "RETENU").length;
    const enAttente = mesInterets.value.filter((i) => i.statut === "EN_ATTENTE").length;
    return [
      { icone: Handshake, label: "Interets exprimes", valeur: mesInterets.value.length },
      { icone: Award, label: "Interets retenus", valeur: retenus },
      { icone: Clock, label: "En attente de reponse", valeur: enAttente },
      { icone: Inbox, label: "Propositions recues", valeur: propositionsCession.value.length },
    ];
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    return [{ icone: Users, label: "Signatures en attente", valeur: mesSignatures.value.length }];
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    const signes = mesImports.value.filter((i) => i.signeParId).length;
    const chevauchements = mesImports.value.filter((i) => i.chevauchementDetecte).length;
    return [
      { icone: Ruler, label: "Plans importes", valeur: mesImports.value.length },
      { icone: CircleCheck, label: "Plans signes", valeur: signes },
      { icone: TriangleAlert, label: "Chevauchements detectes", valeur: chevauchements },
    ];
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    return [{ icone: Gavel, label: "Conflits actifs sur le territoire", valeur: conflitsActifs.value.length }];
  }
  return [];
});

/** Actions rapides de la banniere : 2-3 raccourcis vers les pages reellement les plus utiles pour
 * ce role, pas une liste generique. */
interface NotificationAffichee {
  id: string;
  texte: string;
  sousTexte?: string;
  lien: string;
}

function ilYA(date: string): string {
  const jours = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "il y a 1 jour";
  return `il y a ${jours} jours`;
}

/** "Lu" = reellement mis de cote par l'utilisateur (persiste en local par compte), pas juste
 * masque a l'ecran : si le contenu d'une notification change (ex. le compteur augmente), elle
 * redevient visible malgre son id deja marque lu. */
const cleNotificationsLues = computed(() => `ayinon_notifs_lues_${auth.utilisateur?.id ?? "anonyme"}`);
const notificationsLues = ref<Record<string, string>>({});

function chargerNotificationsLues() {
  try {
    notificationsLues.value = JSON.parse(localStorage.getItem(cleNotificationsLues.value) ?? "{}");
  } catch {
    notificationsLues.value = {};
  }
}

/** Liste reelle de notifications, une entree par evenement effectivement charge sur cette page —
 * jamais une liste inventee. Le CITOYEN n'a pas de flux dans useNotifications() (pas de role
 * regalien a valider) : on utilise a la place ses propres signalements qualifies et le rappel de
 * verrouillage. L'ACHETEUR beneficie en plus des alertes reelles de recherche sauvegardee (E3.2,
 * voir RecherchesSauvegardeesService.compterNouvelles). Les autres roles retombent sur le systeme
 * agrege de la cloche d'en-tete (voir useNotifications.ts). */
const notificationsRecentes = computed<NotificationAffichee[]>(() => {
  const items: NotificationAffichee[] = [];

  if (auth.role === RoleUtilisateur.CITOYEN) {
    for (const s of mesSignalements.value.filter((x) => x.statut !== "DEPOSE").slice(0, 3)) {
      items.push({
        id: `signalement-${s.id}`,
        texte: `Votre signalement sur ${s.parcelle.nup} a ete qualifie ${s.statut === "FONDE" ? "fonde" : "rejete"}`,
        sousTexte: s.traiteLe ? ilYA(s.traiteLe) : undefined,
        lien: "/mes-signalements",
      });
    }
    const nonVerrouillees = mesParcelles.value.filter((p) => !p.verrouAntiVente).length;
    if (nonVerrouillees > 0) {
      items.push({
        id: "rappel-verrouillage",
        texte: `${nonVerrouillees} parcelle(s) non verrouillee(s) contre une vente non consentie`,
        lien: "/passeport-foncier",
      });
    }
  } else if (auth.role === RoleUtilisateur.ACHETEUR) {
    for (const r of mesRecherchesSauvegardees.value.filter((x) => x.nombreNouvelles > 0)) {
      items.push({
        id: `recherche-${r.id}`,
        texte: `${r.nombreNouvelles} nouvelle(s) annonce(s) correspondent a votre recherche sauvegardee « ${r.nom} »`,
        lien: "/annonces",
      });
    }
  } else if (notifications.lien.value && notifications.compte.value > 0) {
    items.push({ id: "flux-agrege", texte: `${notifications.compte.value} ${notifications.libelle.value}`, lien: notifications.lien.value });
  }

  return items.filter((item) => notificationsLues.value[item.id] !== item.texte);
});

async function toutMarquerLu() {
  const lues = { ...notificationsLues.value };
  for (const item of notificationsRecentes.value) {
    lues[item.id] = item.texte;
    if (item.id.startsWith("recherche-")) {
      api.patch(`/recherches-sauvegardees/${item.id.replace("recherche-", "")}/consulter`).catch(() => {});
    }
  }
  notificationsLues.value = lues;
  localStorage.setItem(cleNotificationsLues.value, JSON.stringify(lues));
}

const actionsBandeau = computed(() => {
  if (auth.role === RoleUtilisateur.CITOYEN) {
    return [
      { to: "/carte", label: "Verifier une parcelle", icone: Map },
      { to: "/passeport-foncier", label: "Verrouiller mon bien", icone: ShieldCheck },
      { to: "/mes-signalements", label: "Signaler un probleme", icone: ScrollText },
    ];
  }
  if (auth.role === RoleUtilisateur.VENDEUR) {
    return [
      { to: "/vendre", label: "Vendre un terrain", icone: Megaphone },
      { to: "/annonces", label: "Vitrine des annonces", icone: Store },
      { to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator },
    ];
  }
  if (auth.role === RoleUtilisateur.ACHETEUR) {
    return [
      { to: "/acheter", label: "Acheter un terrain", icone: Handshake },
      { to: "/annonces", label: "Vitrine des annonces", icone: Store },
      { to: "/simulateur-frais", label: "Simulateur de frais", icone: Calculator },
    ];
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    return [{ to: "/famille", label: "Mes mandats", icone: Users }];
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    return [{ to: "/geometre", label: "Importer un plan de bornage", icone: Ruler }];
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    const actions = [
      { to: "/andf", label: "Console des poles", icone: Landmark },
      { to: "/andf/cessions", label: "Cessions a valider", icone: Handshake },
    ];
    if (auth.role === RoleUtilisateur.ADMIN) actions.push({ to: "/admin", label: "Back-office", icone: LayoutDashboard });
    return actions;
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    return [{ to: "/csaf", label: "Gel conservatoire", icone: Gavel }];
  }
  if (auth.role === RoleUtilisateur.AGENT_BANQUE) {
    return [{ to: "/banque/solvabilite", label: "Verifier une solvabilite", icone: Banknote }];
  }
  return [];
});

/** Raccourcis affiches : varient reellement selon le role connecte, pas un menu generique identique pour tous. */
const raccourcis = computed(() => {
  const items = [
    { to: "/carte", icone: Map, titre: "Carte cadastrale", description: "Statut de chaque parcelle, code couleur national." },
    { to: "/annonces", icone: Store, titre: "Vitrine des annonces", description: "Parcourez les terrains publies par des vendeurs verifies." },
  ];
  if (!auth.estConnecte || auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/scanner", icone: ScanLine, titre: "Scanner anti-fraude", description: "Verifiez l'authenticite d'une convention de vente." });
    items.push({ to: "/simulateur-frais", icone: Calculator, titre: "Simulateur de frais", description: "Fini les rackets des demarcheurs illegaux." });
  }
  if (auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/passeport-foncier", icone: ShieldCheck, titre: "Passeport foncier", description: "Verrouillez votre parcelle contre toute vente non consentie." });
    items.push({ to: "/famille", icone: Users, titre: "Terre familiale", description: "Multi-signature et affichage de ban sur une parcelle hereditaire." });
  }
  if (auth.role === RoleUtilisateur.VENDEUR) {
    items.push({ to: "/vendre", icone: Megaphone, titre: "Vendre un terrain", description: "Publiez une parcelle et suivez les acheteurs interesses." });
  }
  if (auth.role === RoleUtilisateur.ACHETEUR) {
    items.push({ to: "/acheter", icone: Handshake, titre: "Acheter un terrain", description: "Suivez vos manifestations d'interet et leur statut." });
  }
  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    items.push({ to: "/famille", icone: Users, titre: "Mes mandats familiaux", description: "Signez ou refusez les mutations qui vous sont soumises." });
  }
  if (auth.role === RoleUtilisateur.GEOMETRE) {
    items.push({ to: "/geometre", icone: Ruler, titre: "Nouvel import de bornage", description: "Televersez un plan, detection automatique des chevauchements." });
  }
  if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
    items.push({ to: "/andf", icone: Landmark, titre: "Console des poles", description: "Zonage et integrite fonciere par pole territorial." });
    items.push({ to: "/andf/cessions", icone: Handshake, titre: "Valider les cessions", description: "Valide les cessions acceptees : delivrance du titre et transfert de propriete." });
  }
  if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
    items.push({ to: "/andf", icone: Landmark, titre: "Console des poles", description: "Vue d'ensemble nationale du zonage foncier." });
    items.push({ to: "/csaf", icone: Gavel, titre: "Gel conservatoire", description: "Placer une parcelle contestee sous sequestre judiciaire." });
  }
  if (auth.role === RoleUtilisateur.AGENT_BANQUE) {
    items.push({
      to: "/banque/solvabilite",
      icone: Banknote,
      titre: "Verifier la solvabilite",
      description: "Titre, gel CSAF, gage existant : verifiez avant credit et inscrivez votre hypotheque.",
    });
  }
  if (auth.role === RoleUtilisateur.ADMIN) {
    items.push({
      to: "/admin",
      icone: LayoutDashboard,
      titre: "Back-office",
      description: "Vue d'ensemble, utilisateurs, proprietaires, parcelles et documents.",
    });
  }
  // E8.9 : suivi d'avancement d'un dossier de litige, accessible a chaque partie prenante habilitee a signaler.
  if (
    auth.role &&
    [RoleUtilisateur.CITOYEN, RoleUtilisateur.VENDEUR, RoleUtilisateur.ACHETEUR, RoleUtilisateur.MANDATAIRE_FAMILIAL].includes(auth.role)
  ) {
    items.push({
      to: "/mes-signalements",
      icone: ScrollText,
      titre: "Mes signalements",
      description: "Suivez l'avancement de vos signalements et contestations.",
    });
  }
  return items;
});
</script>

<template>
  <!-- Visiteur non connecte : hero publique plein cadre, carte du Benin en fond (voir
       HeroCarteBenin.vue) — hors du conteneur max-w-5xl pour occuper toute la largeur. Occupe
       tout le premier ecran : 100vh moins la hauteur du bandeau + de l'en-tete (6rem, sticky). -->
  <section v-if="!auth.estConnecte" class="relative h-[calc(100vh-6rem)] min-h-[28rem] overflow-hidden">
    <HeroCarteBenin />
    <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-64 bg-gradient-to-b from-primaire/55 to-transparent" />

    <div class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center px-4 pt-10 text-center sm:pt-14">
      <h1 class="max-w-xl font-affichage text-3xl font-normal italic text-white [text-shadow:0_2px_18px_rgba(0,0,0,.35)] sm:text-4xl">
        Retrouvez votre terrain en toute serenite.
      </h1>
      <p class="mt-3 max-w-lg text-sm text-white/85 [text-shadow:0_1px_10px_rgba(0,0,0,.3)]">
        Localisation exacte, limites certifiees, statut a jour — votre parcelle, en un instant.
      </p>

      <form
        class="pointer-events-auto mt-6 flex w-full max-w-lg items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 shadow-flottant"
        @submit.prevent="rechercherEtOuvrirCarte"
      >
        <label for="nup" class="sr-only">Numero Unique Parcellaire (NUP), commune ou coordonnees</label>
        <Search :size="18" class="shrink-0 text-texte-attenue" aria-hidden="true" />
        <input
          id="nup"
          v-model="nup"
          type="text"
          placeholder="Rechercher par NUP, commune ou coordonnees"
          class="min-h-0 w-full min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-texte focus:outline-none"
        />
        <BaseButton type="submit" variant="primaire" class="!min-h-0 shrink-0 !rounded-full">Verifier</BaseButton>
      </form>
    </div>

    <!-- Exemple illustratif (NUP fictif), fidele a la DA retenue : montre a quoi ressemble un
         resultat verifie avant meme d'avoir cherche. -->
    <div class="pointer-events-auto absolute bottom-8 left-8 z-10 hidden max-w-xs rounded-carte bg-surface p-6 shadow-flottant sm:block">
      <span class="inline-block rounded-full bg-primaire/10 px-2.5 py-1 text-xs font-bold text-primaire">Situation controlee ANDF</span>
      <h3 class="mt-2.5 font-affichage text-base font-bold text-texte">BJ-LIT-COT-0014</h3>
      <p class="mt-0.5 text-sm text-texte-attenue">Cotonou, Akpakpa — 450 m²</p>
      <a href="#" class="mt-3 inline-block text-sm font-bold text-primaire" @click.prevent>Voir le dossier complet →</a>
    </div>
  </section>

  <div class="space-y-5 px-4 py-10 sm:py-14">
    <!-- Banniere : espace personnel, nom complet + role + date, actions rapides reellement les
         plus utiles pour ce role. -->
    <section v-if="auth.estConnecte" class="overflow-hidden rounded-carte border-b-[3px] border-accent bg-primaire px-6 py-7 text-primaire-contraste shadow-flottant sm:px-7">
      <div class="flex flex-wrap items-center justify-between gap-5">
        <div class="flex items-center gap-4">
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primaire-contraste/25 bg-primaire-contraste/10 text-lg font-bold">
            {{ initiales }}
          </span>
          <div>
            <p class="text-[0.7rem] font-bold uppercase tracking-wider text-accent">Espace personnel</p>
            <h1 class="mt-1 text-xl font-bold sm:text-2xl">Bonjour {{ auth.utilisateur?.nomComplet }}</h1>
            <div class="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-primaire-contraste/75">
              <span class="rounded border border-primaire-contraste/30 px-2 py-0.5 font-semibold">{{ libelleRoleActuel }}</span>
              <span class="capitalize">{{ dateAujourdhui }}</span>
            </div>
          </div>
        </div>
        <div v-if="actionsBandeau.length > 0" class="flex flex-wrap gap-2">
          <RouterLink
            v-for="action in actionsBandeau"
            :key="action.to"
            :to="action.to"
            class="flex items-center gap-2 rounded-carte border border-primaire-contraste/30 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-primaire-contraste/10"
          >
            <component :is="action.icone" :size="16" aria-hidden="true" />
            {{ action.label }}
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Statistiques reelles, propres au role connecte (jamais un chiffre invente). -->
    <section v-if="statistiques.length > 0" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <BaseCard v-for="stat in statistiques" :key="stat.label" rembourrage="sm">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primaire/10 text-primaire">
          <component :is="stat.icone" :size="18" aria-hidden="true" />
        </span>
        <p class="mt-3 text-xs font-bold uppercase tracking-wide text-texte-attenue">{{ stat.label }}</p>
        <p class="mt-1 font-affichage text-2xl font-semibold text-texte">{{ stat.valeur }}</p>
        <p v-if="stat.sousTexte" class="mt-0.5 text-xs text-texte-attenue">{{ stat.sousTexte }}</p>
      </BaseCard>
    </section>

    <div v-if="auth.estConnecte" class="grid gap-4 lg:grid-cols-2">
      <!-- CITOYEN : vos parcelles. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.CITOYEN">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <Map :size="17" class="text-primaire" aria-hidden="true" />
          Vos parcelles
        </h2>
        <p v-if="mesParcelles.length === 0" class="text-sm text-texte-attenue">Aucune parcelle associee a votre compte pour le moment.</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-texte-attenue">
                <th class="pb-2 pr-3 font-semibold">NUP</th>
                <th class="pb-2 pr-3 font-semibold">Commune</th>
                <th class="pb-2 pr-3 font-semibold">Superficie</th>
                <th class="pb-2 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-bordure">
              <tr v-for="p in mesParcelles" :key="p.id">
                <td class="py-2.5 pr-3 font-medium text-texte">{{ p.nup }}</td>
                <td class="py-2.5 pr-3 text-texte-attenue">{{ p.commune }}</td>
                <td class="py-2.5 pr-3 text-texte-attenue">{{ p.superficieM2.toLocaleString("fr-FR") }} m²</td>
                <td class="py-2.5">
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="p.verrouAntiVente ? 'text-succes' : 'text-accent'">
                    <span class="h-1.5 w-1.5 rounded-full" :class="p.verrouAntiVente ? 'bg-succes' : 'bg-accent'" />
                    {{ p.verrouAntiVente ? "Verrouillee" : "Non verrouillee" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>

      <!-- Notifications reelles : une entree par evenement effectivement charge sur cette page,
           jamais une liste inventee (voir notificationsRecentes). Carte normale (pas pleine largeur),
           appariee avec sa voisine dans la grille 2 colonnes, comme dans la DA validee. -->
      <BaseCard>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-semibold text-texte">
            <Bell :size="17" class="text-primaire" aria-hidden="true" />
            Notifications récentes
          </h2>
          <button v-if="notificationsRecentes.length > 0" type="button" class="text-sm font-semibold text-primaire" @click="toutMarquerLu">
            Tout marquer lu
          </button>
        </div>
        <ul v-if="notificationsRecentes.length > 0" class="divide-y divide-bordure">
          <li v-for="notif in notificationsRecentes" :key="notif.id">
            <RouterLink :to="notif.lien" class="group flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-texte">{{ notif.texte }}</p>
                <p v-if="notif.sousTexte" class="mt-0.5 text-xs text-texte-attenue">{{ notif.sousTexte }}</p>
              </div>
              <ChevronRight :size="16" class="mt-0.5 shrink-0 text-texte-attenue transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <p v-else class="text-sm text-texte-attenue">Rien de nouveau pour le moment.</p>
      </BaseCard>

      <!-- CITOYEN : mes signalements (reels, apercu des 3 plus recents). -->
      <BaseCard v-if="auth.role === RoleUtilisateur.CITOYEN && mesSignalements.length > 0">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="flex items-center gap-2 font-semibold text-texte">
            <ScrollText :size="17" class="text-primaire" aria-hidden="true" />
            Mes signalements
          </h2>
          <RouterLink to="/mes-signalements" class="text-sm font-semibold text-primaire">Voir tout →</RouterLink>
        </div>
        <ul class="divide-y divide-bordure">
          <li v-for="s in mesSignalements.slice(0, 3)" :key="s.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              :class="s.statut === 'FONDE' ? 'bg-succes/10 text-succes' : s.statut === 'REJETE' ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'"
            >
              <component :is="s.statut === 'FONDE' ? CircleCheck : s.statut === 'REJETE' ? TriangleAlert : Clock" :size="15" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-texte">{{ s.motif }}</p>
              <p class="text-xs text-texte-attenue">
                {{ s.statut === "DEPOSE" ? "En attente d'examen" : s.statut === "FONDE" ? "Fonde" : "Rejete" }}
              </p>
            </div>
          </li>
        </ul>
      </BaseCard>

      <!-- Vos outils : universel, reellement filtre par role (voir raccourcis). -->
      <BaseCard>
        <h2 class="mb-3 font-semibold text-texte">Vos outils</h2>
        <div class="divide-y divide-bordure">
          <RouterLink
            v-for="raccourci in raccourcis"
            :key="raccourci.to"
            :to="raccourci.to"
            class="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primaire/10 text-primaire">
              <component :is="raccourci.icone" :size="17" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-texte">{{ raccourci.titre }}</p>
              <p class="truncate text-xs text-texte-attenue">{{ raccourci.description }}</p>
            </div>
            <ChevronRight :size="16" class="shrink-0 text-texte-attenue transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </RouterLink>
        </div>
      </BaseCard>

      <!-- VENDEUR : interets en attente sur ses annonces actives. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.VENDEUR">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <Megaphone :size="17" class="text-primaire" aria-hidden="true" />
          Vos annonces
        </h2>
        <p v-if="chargementEspace" class="text-sm text-texte-attenue" role="status">Chargement…</p>
        <p v-else-if="mesAnnonces.length === 0" class="text-sm text-texte-attenue">Aucune annonce publiee pour le moment.</p>
        <ul v-else class="grid gap-3 sm:grid-cols-2">
          <li v-for="a in mesAnnonces" :key="a.id">
            <BaseCard to="/vendre" rembourrage="sm">
              <p class="font-medium text-texte">{{ a.parcelle.nup }} — {{ a.parcelle.commune }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">
                {{ a.interets.filter((i) => i.statut === "EN_ATTENTE").length }} interet(s) en attente
              </p>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>

      <!-- ACHETEUR : propositions de cession recues directement (hors vitrine). -->
      <BaseCard v-if="auth.role === RoleUtilisateur.ACHETEUR && propositionsCession.length > 0">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <Inbox :size="17" class="text-accent" aria-hidden="true" />
          Propositions de cession recues
          <span class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contraste">{{ propositionsCession.length }}</span>
        </h2>
        <ul class="space-y-2">
          <li v-for="p in propositionsCession" :key="p.id">
            <BaseCard to="/acheter" accentue="accent" rembourrage="sm">
              <p class="font-medium text-texte">{{ p.parcelle.nup }} — {{ p.parcelle.commune }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">Proposee par {{ p.vendeurNom }} — {{ p.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>

      <!-- ACHETEUR : manifestations d'interet retenues par un vendeur. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.ACHETEUR && mesInterets.some((i) => i.statut === 'RETENU')">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <Award :size="17" class="text-succes" aria-hidden="true" />
          Interets retenus par un vendeur
        </h2>
        <ul class="space-y-2">
          <li v-for="i in mesInterets.filter((x) => x.statut === 'RETENU')" :key="i.id">
            <BaseCard :to="`/annonces/${i.annonce.id}`" accentue="succes" rembourrage="sm">
              <p class="font-medium text-texte">{{ i.annonce.parcelle.nup }} — {{ i.annonce.parcelle.commune }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">Cession en cours de validation ANDF</p>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>

      <!-- MANDATAIRE_FAMILIAL : signatures en attente, mises en avant sans recherche prealable. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          Vos signatures en attente
          <span v-if="mesSignatures.length > 0" class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contraste">
            {{ mesSignatures.length }}
          </span>
        </h2>
        <p v-if="chargementEspace" class="text-sm text-texte-attenue" role="status">Chargement…</p>
        <p v-else-if="mesSignatures.length === 0" class="text-sm text-texte-attenue">Rien n'attend votre signature pour le moment.</p>
        <ul v-else class="space-y-2">
          <li v-for="s in mesSignatures" :key="s.id">
            <BaseCard :to="`/famille?parcelle=${s.parcelle.id}`" accentue="accent" rembourrage="sm">
              <p class="font-medium text-texte">{{ s.parcelle.nup }} — {{ s.parcelle.commune }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">Signature requise en tant que {{ s.role }}</p>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>

      <!-- GEOMETRE : historique reel des imports. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.GEOMETRE">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <ListClock :size="17" class="text-primaire" aria-hidden="true" />
          Vos imports recents
        </h2>
        <p v-if="chargementEspace" class="text-sm text-texte-attenue" role="status">Chargement…</p>
        <p v-else-if="mesImports.length === 0" class="text-sm text-texte-attenue">Aucun plan de bornage importe pour le moment.</p>
        <ul v-else class="space-y-2">
          <li v-for="i in mesImports" :key="i.id">
            <BaseCard rembourrage="sm">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="font-medium text-texte">{{ i.parcelle.nup }} — {{ i.parcelle.commune }}</p>
                  <p class="text-xs text-texte-attenue">Dossier {{ i.referenceDossier }} · {{ new Date(i.createdAt).toLocaleDateString("fr-FR") }}</p>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="i.chevauchementDetecte ? 'bg-danger/10 text-danger' : i.signeParId ? 'bg-succes/10 text-succes' : 'bg-accent/10 text-accent'"
                >
                  <component :is="i.chevauchementDetecte ? TriangleAlert : i.signeParId ? CircleCheck : Clock" :size="12" aria-hidden="true" />
                  {{ i.chevauchementDetecte ? "Chevauchement" : i.signeParId ? "Signe" : "A signer" }}
                </span>
              </div>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>

      <!-- MAGISTRAT_CSAF : conflits actifs sur tout le territoire. -->
      <BaseCard v-if="auth.role === RoleUtilisateur.MAGISTRAT_CSAF">
        <h2 class="mb-3 flex items-center gap-2 font-semibold text-texte">
          <Gavel :size="17" class="text-danger" aria-hidden="true" />
          Conflits CSAF actifs
        </h2>
        <p v-if="chargementEspace" class="text-sm text-texte-attenue" role="status">Chargement…</p>
        <p v-else-if="conflitsActifs.length === 0" class="text-sm text-texte-attenue">Aucun conflit actif sur le territoire.</p>
        <ul v-else class="space-y-2">
          <li v-for="c in conflitsActifs" :key="c.id">
            <BaseCard accentue="danger" rembourrage="sm">
              <p class="font-medium text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
              <p class="mt-0.5 text-xs text-texte-attenue">{{ c.motif }} — gele le {{ new Date(c.dateGel).toLocaleDateString("fr-FR") }}</p>
            </BaseCard>
          </li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
