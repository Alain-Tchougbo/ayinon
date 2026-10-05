<script setup lang="ts">
import { BadgeX, FileSignature, ScrollText, Search } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useParcellesStore } from "../../stores/parcelles.store";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface EntreeAudit {
  id: string;
  typeOperation: string;
  roleActeur: string | null;
  horodatage: string;
}
interface DocumentNotaire {
  conventions: Array<{
    id: string;
    vendeurNom: string;
    acquereurNom: string;
    montantFcfa: number;
    statutCession: string;
    valide: boolean;
    createdAt: string;
    parcelle: { id: string; nup: string; commune: string };
  }>;
  titres: Array<{ id: string; numeroTitre: string; dateDelivrance: string; parcelle: { id: string; nup: string } }>;
}

const parcelles = useParcellesStore();

const nupRecherche = ref("");
const parcelleCible = ref<{ id: string; nup: string; commune: string; statut: string } | null>(null);
const historique = ref<EntreeAudit[] | null>(null);
const erreurRecherche = ref<string | null>(null);

const vendeurNom = ref("");
const acquereurNom = ref("");
const montantFcfa = ref("");
const fichier = ref<File | null>(null);
const enScellement = ref(false);
const messageScellement = ref<string | null>(null);
const erreurScellement = ref<string | null>(null);

const documents = ref<DocumentNotaire>({ conventions: [], titres: [] });
const chargementDocuments = ref(true);
const invalidationEnCoursId = ref<string | null>(null);
const erreurInvalidation = ref<string | null>(null);

onMounted(chargerDocuments);

async function chargerDocuments() {
  chargementDocuments.value = true;
  try {
    documents.value = await api.get<DocumentNotaire>("/notaire/documents");
  } finally {
    chargementDocuments.value = false;
  }
}

function surChoixFichier(evenement: Event) {
  fichier.value = (evenement.target as HTMLInputElement).files?.[0] ?? null;
}

async function chercherParcelle() {
  erreurRecherche.value = null;
  historique.value = null;
  const resultats = await parcelles.rechercher({ nup: nupRecherche.value });
  parcelleCible.value = resultats[0] ?? null;
  if (!parcelleCible.value) {
    erreurRecherche.value = "Aucune parcelle trouvee";
    return;
  }
  historique.value = await api.get<EntreeAudit[]>(`/audit/parcelles/${parcelleCible.value.id}/historique`);
}

async function sceller() {
  if (!parcelleCible.value) return;
  erreurScellement.value = null;
  messageScellement.value = null;
  enScellement.value = true;
  try {
    const donnees = new FormData();
    donnees.set("parcelleId", parcelleCible.value.id);
    donnees.set("vendeurNom", vendeurNom.value);
    donnees.set("acquereurNom", acquereurNom.value);
    donnees.set("montantFcfa", montantFcfa.value);
    if (fichier.value) donnees.set("fichier", fichier.value);

    await api.postForm("/conventions", donnees);
    messageScellement.value = `Convention scellee pour la parcelle ${parcelleCible.value.nup}.`;
    vendeurNom.value = "";
    acquereurNom.value = "";
    montantFcfa.value = "";
    fichier.value = null;
    await chargerDocuments();
  } catch (e) {
    erreurScellement.value = e instanceof ApiError ? e.message : "Scellement impossible";
  } finally {
    enScellement.value = false;
  }
}

async function invaliderConvention(id: string) {
  erreurInvalidation.value = null;
  invalidationEnCoursId.value = id;
  try {
    await api.patch(`/conventions/${id}/invalider`);
    await chargerDocuments();
  } catch (e) {
    erreurInvalidation.value = e instanceof ApiError ? e.message : "Invalidation impossible";
  } finally {
    invalidationEnCoursId.value = null;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Espace notaire"
      description="Retrouvez une parcelle pour en consulter l'historique, scellez une convention, ou invalidez un document errone."
    >
      <template #icone><FileSignature :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <form class="flex gap-2" @submit.prevent="chercherParcelle">
      <div class="relative flex-1">
        <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
        <input
          v-model="nupRecherche"
          placeholder="NUP de la parcelle (ex. BJ-LIT-COT-0001)"
          class="w-full rounded-carte border border-bordure bg-surface py-2.5 pl-10 pr-3 text-sm text-texte"
        />
      </div>
      <BaseButton type="submit" variant="secondaire">Rechercher</BaseButton>
    </form>
    <p v-if="erreurRecherche" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreurRecherche }}</p>

    <BaseCard v-if="parcelleCible">
      <p class="font-semibold text-texte">{{ parcelleCible.nup }} - {{ parcelleCible.commune }}</p>
      <p class="text-xs text-texte-attenue">Statut actuel : {{ parcelleCible.statut }}</p>

      <div class="mt-3 border-t border-bordure pt-3">
        <h2 class="mb-2 flex items-center gap-1.5 text-sm font-semibold text-texte"><ScrollText :size="15" aria-hidden="true" /> Historique</h2>
        <p v-if="!historique || historique.length === 0" class="text-sm text-texte-attenue">Aucune operation enregistree sur cette parcelle.</p>
        <ol v-else class="space-y-1.5 border-l-2 border-bordure pl-3.5 text-sm">
          <li v-for="entree in historique" :key="entree.id">
            <p class="font-medium text-texte">{{ entree.typeOperation.replaceAll("_", " ") }}</p>
            <p class="text-xs text-texte-attenue">{{ new Date(entree.horodatage).toLocaleString("fr-FR") }}</p>
          </li>
        </ol>
      </div>

      <div class="mt-4 space-y-2.5 border-t border-bordure pt-3.5">
        <h2 class="text-sm font-semibold text-texte">Sceller une convention sur cette parcelle</h2>
        <BaseInput id="vendeur-nom" v-model="vendeurNom" label="Nom du vendeur" />
        <BaseInput id="acquereur-nom" v-model="acquereurNom" label="Nom de l'acquereur" />
        <BaseInput id="montant-fcfa" v-model="montantFcfa" type="number" label="Montant (FCFA)" />
        <div>
          <label for="fichier-convention" class="mb-1 block text-xs font-medium text-texte">Document numerise (optionnel)</label>
          <input id="fichier-convention" type="file" class="w-full text-xs text-texte" @change="surChoixFichier" />
        </div>
        <p v-if="erreurScellement" class="rounded-carte bg-danger/10 p-2.5 text-xs text-danger" role="alert">{{ erreurScellement }}</p>
        <p v-if="messageScellement" class="rounded-carte bg-succes/10 p-2.5 text-xs text-succes" role="status">{{ messageScellement }}</p>
        <BaseButton taille="sm" :disabled="enScellement || !vendeurNom || !acquereurNom || !montantFcfa" @click="sceller">
          Sceller la convention
        </BaseButton>
      </div>
    </BaseCard>

    <div>
      <h2 class="mb-3 font-semibold text-texte">Conventions et titres recents</h2>
      <p v-if="erreurInvalidation" class="mb-2 rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreurInvalidation }}</p>
      <p v-if="chargementDocuments" class="text-sm text-texte-attenue" role="status">Chargement...</p>
      <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Convention</th>
              <th class="px-4 py-3 font-semibold">Statut</th>
              <th class="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <tr v-for="c in documents.conventions" :key="c.id" class="align-top">
              <td class="px-4 py-3">
                <p class="font-medium text-texte">{{ c.parcelle.nup }} - {{ c.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">{{ c.vendeurNom }} → {{ c.acquereurNom }} - {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="c.valide ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'">
                  {{ c.valide ? "Valide" : "Invalidee" }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <BaseButton
                  v-if="c.valide"
                  taille="sm"
                  variant="danger"
                  :disabled="invalidationEnCoursId === c.id"
                  @click="invaliderConvention(c.id)"
                >
                  <BadgeX :size="14" aria-hidden="true" />
                  Invalider
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
