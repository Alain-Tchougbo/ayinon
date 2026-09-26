<script setup lang="ts">
import {
  Award,
  Banknote,
  Calculator,
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
import { useVoiceAssistant } from "../composables/useVoiceAssistant";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth.store";
import { useParcellesStore } from "../stores/parcelles.store";
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

const router = useRouter();
const auth = useAuthStore();
const { definirPhraseCourante } = useVoiceAssistant();
const parcelles = useParcellesStore();
const nup = ref("");

const mesSignatures = ref<SignatureEnAttente[]>([]);
const mesImports = ref<MonImport[]>([]);
const conflitsActifs = ref<ConflitCsaf[]>([]);
const mesAnnonces = ref<AnnonceAvecInterets[]>([]);
const mesInterets = ref<InteretExprime[]>([]);
const propositionsCession = ref<PropositionCession[]>([]);
const chargementEspace = ref(false);

const mesParcelles = computed(() => parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId));

// Prenom seul : le nom complet et le role sont deja affiches en permanence dans l'en-tete du
// tableau de bord, inutile de les repeter integralement ici.
const prenom = computed(() => auth.utilisateur?.nomComplet.trim().split(/\s+/)[0] ?? "");

onMounted(async () => {
  definirPhraseCourante(PHRASES.bienvenue);
  if (!auth.estConnecte) return;
  chargementEspace.value = true;
  try {
    if (auth.role === RoleUtilisateur.CITOYEN) {
      await parcelles.chargerToutes();
    } else if (auth.role === RoleUtilisateur.VENDEUR) {
      mesAnnonces.value = await api.get<AnnonceAvecInterets[]>("/annonces/mes-annonces");
    } else if (auth.role === RoleUtilisateur.ACHETEUR) {
      [mesInterets.value, propositionsCession.value] = await Promise.all([
        api.get<InteretExprime[]>("/annonces/mes-interets"),
        api.get<PropositionCession[]>("/cessions/mes-propositions-recues"),
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

  <div class="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:py-14">
    <!-- Connecte : espace personnalise, different pour chaque role. Le nom complet et le role
         sont deja visibles en permanence dans l'en-tete : pas la peine de les repeter ici. -->
    <section v-if="auth.estConnecte" class="rounded-carte bg-primaire px-6 py-8 text-primaire-contraste shadow-flottant">
      <h1 class="text-2xl font-bold">Bonjour {{ prenom }}</h1>
      <p class="mt-1 text-sm text-primaire-contraste/80">Voici l'etat de votre espace AYINON aujourd'hui.</p>
    </section>

    <!-- CITOYEN : vos parcelles. -->
    <section v-if="auth.role === RoleUtilisateur.CITOYEN">
      <h2 class="mb-3 text-lg font-semibold text-texte">Vos parcelles</h2>
      <p v-if="mesParcelles.length === 0" class="text-sm text-texte-attenue">Aucune parcelle associee a votre compte pour le moment.</p>
      <ul v-else class="grid gap-3 sm:grid-cols-2">
        <li v-for="p in mesParcelles" :key="p.id">
          <BaseCard rembourrage="sm">
            <p class="font-medium text-texte">{{ p.nup }} — {{ p.commune }}</p>
            <p class="mt-0.5 text-xs text-texte-attenue">{{ p.superficieM2.toLocaleString("fr-FR") }} m²</p>
            <span
              class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="p.verrouAntiVente ? 'bg-succes/10 text-succes' : 'bg-accent/10 text-accent'"
            >
              {{ p.verrouAntiVente ? "Verrouillee" : "Non verrouillee" }}
            </span>
          </BaseCard>
        </li>
      </ul>
    </section>

    <!-- VENDEUR : interets en attente sur ses annonces actives. -->
    <section v-if="auth.role === RoleUtilisateur.VENDEUR">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Megaphone :size="18" class="text-primaire" aria-hidden="true" />
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
    </section>

    <!-- ACHETEUR : propositions de cession recues directement (hors vitrine). -->
    <section v-if="auth.role === RoleUtilisateur.ACHETEUR && propositionsCession.length > 0">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Inbox :size="18" class="text-accent" aria-hidden="true" />
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
    </section>

    <!-- ACHETEUR : manifestations d'interet retenues par un vendeur. -->
    <section v-if="auth.role === RoleUtilisateur.ACHETEUR && mesInterets.some((i) => i.statut === 'RETENU')">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Award :size="18" class="text-succes" aria-hidden="true" />
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
    </section>

    <!-- MANDATAIRE_FAMILIAL : signatures en attente, mises en avant sans recherche prealable. -->
    <section v-if="auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
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
    </section>

    <!-- GEOMETRE : historique reel des imports. -->
    <section v-if="auth.role === RoleUtilisateur.GEOMETRE">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <ListClock :size="18" class="text-primaire" aria-hidden="true" />
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
    </section>

    <!-- MAGISTRAT_CSAF : conflits actifs sur tout le territoire. -->
    <section v-if="auth.role === RoleUtilisateur.MAGISTRAT_CSAF">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Gavel :size="18" class="text-danger" aria-hidden="true" />
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
    </section>

    <!-- Raccourcis : reellement filtres par role, pas un menu identique pour tout le monde. -->
    <section>
      <h2 v-if="auth.estConnecte" class="mb-3 text-lg font-semibold text-texte">Vos outils</h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BaseCard v-for="raccourci in raccourcis" :key="raccourci.to" :to="raccourci.to">
          <span class="flex h-11 w-11 items-center justify-center rounded-carte bg-primaire/10 text-primaire transition-colors group-hover:bg-primaire group-hover:text-primaire-contraste">
            <component :is="raccourci.icone" :size="22" aria-hidden="true" />
          </span>
          <h3 class="mt-3.5 font-semibold text-texte">{{ raccourci.titre }}</h3>
          <p class="mt-1 text-sm text-texte-attenue">{{ raccourci.description }}</p>
        </BaseCard>
      </div>
    </section>
  </div>
</template>
