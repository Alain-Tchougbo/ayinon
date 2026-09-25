<script setup lang="ts">
import { Check, FileStack, Flag, LayoutDashboard, MapPin, Pencil, Users, X } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface VueEnsemble {
  utilisateursParRole: Array<{ role: string; total: number }>;
  parcellesParStatut: Array<{ statut: string; total: number }>;
  totalConventions: number;
  totalTitres: number;
  hypothequesActives: number;
  totalProprietaires: number;
}
interface Utilisateur {
  id: string;
  email: string;
  role: string;
  nomComplet: string;
  telephone: string | null;
  poleTerritorial: string | null;
  createdAt: string;
}
interface Proprietaire {
  id: string;
  nomComplet: string;
  email: string | null;
  telephone: string | null;
  estDiaspora: boolean;
  nombreParcelles: number;
}
interface ParcelleAdmin {
  id: string;
  nup: string;
  commune: string;
  arrondissement: string | null;
  statut: string;
  superficieM2: number;
  proprietaire: { nomComplet: string } | null;
}
interface Documents {
  conventions: Array<{ id: string; vendeurNom: string; acquereurNom: string; montantFcfa: number; statutCession: string; parcelle: { nup: string } }>;
  titres: Array<{ id: string; numeroTitre: string; dateDelivrance: string; parcelle: { nup: string } }>;
}
interface Signalement {
  id: string;
  type: "ANNONCE" | "LITIGE_FONCIER";
  statut: "DEPOSE" | "FONDE" | "REJETE";
  motif: string;
  descriptif: string | null;
  decisionMotif: string | null;
  createdAt: string;
  parcelle: { nup: string; commune: string };
  annonce: { id: string; statut: string } | null;
  signalant: { nomComplet: string; role: string };
}

const ONGLETS = [
  { cle: "vue-ensemble", label: "Vue d'ensemble" },
  { cle: "utilisateurs", label: "Utilisateurs" },
  { cle: "proprietaires", label: "Proprietaires" },
  { cle: "parcelles", label: "Parcelles" },
  { cle: "documents", label: "Documents" },
  { cle: "signalements", label: "Signalements" },
] as const;
type Onglet = (typeof ONGLETS)[number]["cle"];

const { definirPhraseCourante } = useVoiceAssistant();
const ongletActif = ref<Onglet>("vue-ensemble");

const vueEnsemble = ref<VueEnsemble | null>(null);
const utilisateurs = ref<Utilisateur[]>([]);
const proprietaires = ref<Proprietaire[]>([]);
const parcelles = ref<ParcelleAdmin[]>([]);
const documents = ref<Documents | null>(null);
const signalements = ref<Signalement[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const editionEnCours = ref<string | null>(null);
const communeEdition = ref("");
const arrondissementEdition = ref("");

const qualificationEnCours = ref<string | null>(null);
const motifQualification = ref("");
const actionEnCours = ref(false);

onMounted(async () => {
  definirPhraseCourante(PHRASES.adminIntro);
  await charger("vue-ensemble");
});

async function charger(onglet: Onglet) {
  ongletActif.value = onglet;
  chargement.value = true;
  erreur.value = null;
  try {
    if (onglet === "vue-ensemble") vueEnsemble.value = await api.get<VueEnsemble>("/admin/vue-ensemble");
    else if (onglet === "utilisateurs") utilisateurs.value = await api.get<Utilisateur[]>("/admin/utilisateurs");
    else if (onglet === "proprietaires") proprietaires.value = await api.get<Proprietaire[]>("/admin/proprietaires");
    else if (onglet === "parcelles") parcelles.value = await api.get<ParcelleAdmin[]>("/admin/parcelles");
    else if (onglet === "documents") documents.value = await api.get<Documents>("/admin/documents");
    else if (onglet === "signalements") signalements.value = await api.get<Signalement[]>("/signalements");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

function ouvrirEdition(parcelle: ParcelleAdmin) {
  editionEnCours.value = parcelle.id;
  communeEdition.value = parcelle.commune;
  arrondissementEdition.value = parcelle.arrondissement ?? "";
}

async function enregistrerEdition(id: string) {
  erreur.value = null;
  message.value = null;
  try {
    await api.patch(`/admin/parcelles/${id}`, { commune: communeEdition.value, arrondissement: arrondissementEdition.value || null });
    message.value = "Parcelle mise a jour.";
    editionEnCours.value = null;
    await charger("parcelles");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Mise a jour impossible";
  }
}

async function qualifier(id: string, fonde: boolean) {
  erreur.value = null;
  message.value = null;
  const motif = motifQualification.value.trim();
  if (motif.length < 10) {
    erreur.value = "Le motif de decision doit compter au moins 10 caracteres";
    return;
  }
  actionEnCours.value = true;
  try {
    await api.patch(`/signalements/${id}/qualifier`, { fonde, motif });
    message.value = fonde ? "Signalement retenu comme fonde." : "Signalement rejete.";
    qualificationEnCours.value = null;
    motifQualification.value = "";
    await charger("signalements");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Qualification impossible";
  } finally {
    actionEnCours.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Back-office AYINON"
      description="Vue d'ensemble et gestion de contenu : utilisateurs, proprietaires, parcelles, documents."
    >
      <template #icone><LayoutDashboard :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <nav class="flex flex-wrap gap-1.5 border-b border-bordure pb-2" aria-label="Sections du back-office">
      <button
        v-for="onglet in ONGLETS"
        :key="onglet.cle"
        type="button"
        class="rounded-carte px-3.5 py-2 text-sm font-medium transition-colors"
        :class="ongletActif === onglet.cle ? 'bg-primaire text-primaire-contraste' : 'text-texte-attenue hover:bg-fond'"
        @click="charger(onglet.cle)"
      >
        {{ onglet.label }}
      </button>
    </nav>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <!-- Vue d'ensemble -->
    <div v-if="!chargement && ongletActif === 'vue-ensemble' && vueEnsemble" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <BaseCard>
        <p class="flex items-center gap-1.5 text-xs font-semibold text-texte-attenue"><Users :size="13" aria-hidden="true" /> Utilisateurs par role</p>
        <ul class="mt-2 space-y-1 text-sm">
          <li v-for="u in vueEnsemble.utilisateursParRole" :key="u.role" class="flex justify-between">
            <span class="text-texte-attenue">{{ u.role.replaceAll("_", " ") }}</span>
            <span class="font-semibold text-texte">{{ u.total }}</span>
          </li>
        </ul>
      </BaseCard>
      <BaseCard>
        <p class="flex items-center gap-1.5 text-xs font-semibold text-texte-attenue"><MapPin :size="13" aria-hidden="true" /> Parcelles par statut</p>
        <ul class="mt-2 space-y-1 text-sm">
          <li v-for="p in vueEnsemble.parcellesParStatut" :key="p.statut" class="flex justify-between">
            <span class="text-texte-attenue">{{ p.statut.replaceAll("_", " ") }}</span>
            <span class="font-semibold text-texte">{{ p.total }}</span>
          </li>
        </ul>
      </BaseCard>
      <BaseCard>
        <p class="text-xs font-semibold text-texte-attenue">Registre foncier</p>
        <ul class="mt-2 space-y-1 text-sm">
          <li class="flex justify-between"><span class="text-texte-attenue">Proprietaires</span><span class="font-semibold text-texte">{{ vueEnsemble.totalProprietaires }}</span></li>
          <li class="flex justify-between"><span class="text-texte-attenue">Conventions</span><span class="font-semibold text-texte">{{ vueEnsemble.totalConventions }}</span></li>
          <li class="flex justify-between"><span class="text-texte-attenue">Titres delivres</span><span class="font-semibold text-texte">{{ vueEnsemble.totalTitres }}</span></li>
          <li class="flex justify-between"><span class="text-texte-attenue">Hypotheques actives</span><span class="font-semibold text-texte">{{ vueEnsemble.hypothequesActives }}</span></li>
        </ul>
      </BaseCard>
    </div>

    <!-- Utilisateurs -->
    <div v-if="!chargement && ongletActif === 'utilisateurs'" class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-bordure text-left text-xs text-texte-attenue">
            <th class="px-3.5 py-2.5">Nom</th>
            <th class="px-3.5 py-2.5">Email</th>
            <th class="px-3.5 py-2.5">Role</th>
            <th class="px-3.5 py-2.5">Pole</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in utilisateurs" :key="u.id" class="border-b border-bordure last:border-0">
            <td class="px-3.5 py-2.5 font-medium text-texte">{{ u.nomComplet }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ u.email }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ u.role.replaceAll("_", " ") }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ u.poleTerritorial?.replaceAll("_", " ") ?? "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Proprietaires -->
    <div v-if="!chargement && ongletActif === 'proprietaires'" class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-bordure text-left text-xs text-texte-attenue">
            <th class="px-3.5 py-2.5">Nom</th>
            <th class="px-3.5 py-2.5">Contact</th>
            <th class="px-3.5 py-2.5">Diaspora</th>
            <th class="px-3.5 py-2.5">Parcelles</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in proprietaires" :key="p.id" class="border-b border-bordure last:border-0">
            <td class="px-3.5 py-2.5 font-medium text-texte">{{ p.nomComplet }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ p.email ?? p.telephone ?? "—" }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ p.estDiaspora ? "Oui" : "Non" }}</td>
            <td class="px-3.5 py-2.5 text-texte-attenue">{{ p.nombreParcelles }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Parcelles (avec edition basique) -->
    <ul v-if="!chargement && ongletActif === 'parcelles'" class="space-y-2.5">
      <li v-for="p in parcelles" :key="p.id">
        <BaseCard rembourrage="sm">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-medium text-texte">{{ p.nup }} — {{ p.commune }}<span v-if="p.arrondissement"> ({{ p.arrondissement }})</span></p>
              <p class="text-xs text-texte-attenue">
                {{ p.proprietaire?.nomComplet ?? "Sans proprietaire" }} — {{ p.superficieM2.toLocaleString("fr-FR") }} m² — {{ p.statut.replaceAll("_", " ") }}
              </p>
            </div>
            <BaseButton v-if="editionEnCours !== p.id" taille="sm" variant="secondaire" @click="ouvrirEdition(p)">
              <Pencil :size="13" aria-hidden="true" />
              Modifier
            </BaseButton>
          </div>
          <div v-if="editionEnCours === p.id" class="mt-3 flex flex-wrap items-end gap-2">
            <div class="w-48"><BaseInput id="commune-edition" v-model="communeEdition" label="Commune" /></div>
            <div class="w-48"><BaseInput id="arrondissement-edition" v-model="arrondissementEdition" label="Arrondissement" /></div>
            <BaseButton taille="sm" @click="enregistrerEdition(p.id)">Enregistrer</BaseButton>
            <BaseButton taille="sm" variant="secondaire" @click="editionEnCours = null">Annuler</BaseButton>
          </div>
        </BaseCard>
      </li>
    </ul>

    <!-- Documents -->
    <div v-if="!chargement && ongletActif === 'documents' && documents" class="space-y-6">
      <div>
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-texte"><FileStack :size="15" aria-hidden="true" /> Conventions ({{ documents.conventions.length }})</h2>
        <ul class="space-y-2">
          <li v-for="c in documents.conventions" :key="c.id" class="rounded-carte border border-bordure bg-surface px-3.5 py-2.5 text-sm">
            <span class="font-medium text-texte">{{ c.parcelle.nup }}</span>
            <span class="text-texte-attenue"> — {{ c.vendeurNom }} → {{ c.acquereurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA — {{ c.statutCession.replaceAll("_", " ") }}</span>
          </li>
        </ul>
      </div>
      <div>
        <h2 class="mb-2 text-sm font-semibold text-texte">Titres delivres ({{ documents.titres.length }})</h2>
        <ul class="space-y-2">
          <li v-for="t in documents.titres" :key="t.id" class="rounded-carte border border-bordure bg-surface px-3.5 py-2.5 text-sm">
            <span class="font-medium text-texte">{{ t.numeroTitre }}</span>
            <span class="text-texte-attenue"> — {{ t.parcelle.nup }} — delivre le {{ new Date(t.dateDelivrance).toLocaleDateString("fr-FR") }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Signalements -->
    <ul v-if="!chargement && ongletActif === 'signalements'" class="space-y-2.5">
      <li v-if="signalements.length === 0" class="text-sm text-texte-attenue">Aucun signalement pour le moment.</li>
      <li v-for="s in signalements" :key="s.id">
        <BaseCard rembourrage="sm" :accentue="s.statut === 'FONDE' ? 'danger' : s.statut === 'DEPOSE' ? 'accent' : 'aucun'">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="flex items-center gap-1.5 font-medium text-texte">
                <Flag :size="13" aria-hidden="true" />
                {{ s.type === "ANNONCE" ? "Probleme sur une annonce" : "Litige foncier" }} — {{ s.parcelle.nup }} ({{ s.parcelle.commune }})
              </p>
              <p class="mt-0.5 text-xs text-texte-attenue">Signale par {{ s.signalant.nomComplet }} ({{ s.signalant.role.replaceAll("_", " ") }})</p>
              <p class="mt-1.5 text-sm text-texte">{{ s.motif }}</p>
              <p v-if="s.descriptif" class="mt-1 text-xs text-texte-attenue">{{ s.descriptif }}</p>
              <p v-if="s.decisionMotif" class="mt-1.5 text-xs italic text-texte-attenue">Decision : {{ s.decisionMotif }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="s.statut === 'FONDE' ? 'bg-danger/10 text-danger' : s.statut === 'REJETE' ? 'bg-texte-attenue/10 text-texte-attenue' : 'bg-accent/10 text-accent'"
            >
              {{ s.statut === "DEPOSE" ? "A qualifier" : s.statut === "FONDE" ? "Fonde" : "Rejete" }}
            </span>
          </div>

          <template v-if="s.statut === 'DEPOSE'">
            <div v-if="qualificationEnCours === s.id" class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <label :for="`motif-qualif-${s.id}`" class="block text-xs font-medium text-texte">Motif de la decision (obligatoire)</label>
              <textarea
                :id="`motif-qualif-${s.id}`"
                v-model="motifQualification"
                rows="2"
                class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
              />
              <div class="flex gap-2">
                <BaseButton taille="sm" variant="danger" :disabled="actionEnCours" @click="qualifier(s.id, true)">
                  <Check :size="12" aria-hidden="true" />
                  Retenir comme fonde
                </BaseButton>
                <BaseButton taille="sm" variant="secondaire" :disabled="actionEnCours" @click="qualifier(s.id, false)">
                  <X :size="12" aria-hidden="true" />
                  Rejeter
                </BaseButton>
                <BaseButton taille="sm" variant="ghost" @click="qualificationEnCours = null">Annuler</BaseButton>
              </div>
            </div>
            <BaseButton v-else taille="sm" class="mt-3" @click="qualificationEnCours = s.id">Qualifier</BaseButton>
          </template>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
