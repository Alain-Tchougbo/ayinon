<script setup lang="ts">
import {
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
  Ruler,
  ScanLine,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "@lucide/vue";
import { RoleUtilisateur } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
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
      propositionsCession.value = await api.get<PropositionCession[]>("/cessions/mes-propositions-recues");
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
  const items = [{ to: "/carte", icone: Map, titre: "Carte cadastrale", description: "Statut de chaque parcelle, code couleur national." }];
  if (!auth.estConnecte || auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/scanner", icone: ScanLine, titre: "Scanner anti-fraude", description: "Verifiez l'authenticite d'une convention de vente." });
    items.push({ to: "/simulateur-frais", icone: Calculator, titre: "Simulateur de frais", description: "Fini les rackets des demarcheurs illegaux." });
  }
  if (auth.role === RoleUtilisateur.CITOYEN) {
    items.push({ to: "/passeport-foncier", icone: ShieldCheck, titre: "Passeport foncier", description: "Verrouillez votre parcelle contre toute vente non consentie." });
    items.push({ to: "/cession", icone: Handshake, titre: "Ceder ou acquerir un terrain", description: "Proposez une vente ou repondez a une proposition d'achat." });
    items.push({ to: "/famille", icone: Users, titre: "Terre familiale", description: "Multi-signature et affichage de ban sur une parcelle hereditaire." });
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
  return items;
});
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:py-14">
    <!-- Visiteur non connecte : hero public generique + recherche NUP. -->
    <section v-if="!auth.estConnecte" class="rounded-carte bg-primaire px-6 py-12 text-center text-primaire-contraste shadow-flottant sm:py-16">
      <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">AYINON</h1>
      <p class="mt-2 text-lg text-primaire-contraste/90">Le Gardien Numerique de la Terre</p>
      <p class="mx-auto mt-4 max-w-2xl text-sm text-primaire-contraste/80">
        Verifiez, securisez et defendez votre terre. Programme « Plus Loin, Ensemble » — territorialisation,
        democratisation du titre foncier, paix sociale.
      </p>

      <form class="mx-auto mt-7 flex max-w-md gap-2" @submit.prevent="rechercherEtOuvrirCarte">
        <label for="nup" class="sr-only">Numero Unique Parcellaire (NUP)</label>
        <div class="relative flex-1">
          <Search :size="18" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          <input
            id="nup"
            v-model="nup"
            type="text"
            placeholder="Entrez votre NUP (ex. BJ-LIT-COT-0001)"
            class="w-full rounded-carte border-0 py-3 pl-10 pr-4 text-sm text-texte"
          />
        </div>
        <BaseButton type="submit" variant="accent" class="shrink-0">Verifier</BaseButton>
      </form>
    </section>

    <!-- Connecte : espace personnalise, different pour chaque role. Le nom complet et le role
         sont deja visibles en permanence dans l'en-tete : pas la peine de les repeter ici. -->
    <section v-else class="rounded-carte bg-primaire px-6 py-8 text-primaire-contraste shadow-flottant">
      <h1 class="text-2xl font-bold">Bonjour {{ prenom }}</h1>
      <p class="mt-1 text-sm text-primaire-contraste/80">Voici l'etat de votre espace AYINON aujourd'hui.</p>
    </section>

    <!-- CITOYEN : propositions de cession recues, mises en avant comme les signatures familiales en attente. -->
    <section v-if="auth.role === RoleUtilisateur.CITOYEN && propositionsCession.length > 0">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Inbox :size="18" class="text-accent" aria-hidden="true" />
        Propositions de cession recues
        <span class="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contraste">{{ propositionsCession.length }}</span>
      </h2>
      <ul class="space-y-2">
        <li v-for="p in propositionsCession" :key="p.id">
          <BaseCard :to="`/cession`" accentue="accent" rembourrage="sm">
            <p class="font-medium text-texte">{{ p.parcelle.nup }} — {{ p.parcelle.commune }}</p>
            <p class="mt-0.5 text-xs text-texte-attenue">Proposee par {{ p.vendeurNom }} — {{ p.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>
          </BaseCard>
        </li>
      </ul>
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
