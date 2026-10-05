<script setup lang="ts">
import { BadgeX, FileBadge, QrCode } from "@lucide/vue";
import { LIBELLE_TYPE_DOCUMENT_INSTITUTIONNEL, TypeDocumentInstitutionnel } from "@ayinon/shared";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface DocumentInstitutionnel {
  id: string;
  titre: string;
  type: string;
  description: string | null;
  valide: boolean;
  createdAt: string;
  emetteur: { nomComplet: string };
}

const titre = ref("");
const type = ref<TypeDocumentInstitutionnel>(TypeDocumentInstitutionnel.DECISION_ADMINISTRATIVE);
const description = ref("");
const fichier = ref<File | null>(null);
const enScellement = ref(false);
const message = ref<string | null>(null);
const erreur = ref<string | null>(null);

const documents = ref<DocumentInstitutionnel[]>([]);
const chargement = ref(true);
const qrOuvertPourId = ref<string | null>(null);
const qrDataUrl = ref<string | null>(null);
const invalidationEnCoursId = ref<string | null>(null);

onMounted(chargerDocuments);

async function chargerDocuments() {
  chargement.value = true;
  try {
    documents.value = await api.get<DocumentInstitutionnel[]>("/documents-institutionnels");
  } finally {
    chargement.value = false;
  }
}

function surChoixFichier(evenement: Event) {
  fichier.value = (evenement.target as HTMLInputElement).files?.[0] ?? null;
}

async function sceller() {
  erreur.value = null;
  message.value = null;
  enScellement.value = true;
  try {
    const donnees = new FormData();
    donnees.set("titre", titre.value);
    donnees.set("type", type.value);
    if (description.value) donnees.set("description", description.value);
    if (fichier.value) donnees.set("fichier", fichier.value);

    await api.postForm("/documents-institutionnels", donnees);
    message.value = "Document scelle avec succes.";
    titre.value = "";
    description.value = "";
    fichier.value = null;
    await chargerDocuments();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Scellement impossible";
  } finally {
    enScellement.value = false;
  }
}

async function voirQr(id: string) {
  qrOuvertPourId.value = id;
  const reponse = await api.get<{ qrCodeDataUrl: string }>(`/documents-institutionnels/${id}/qr`);
  qrDataUrl.value = reponse.qrCodeDataUrl;
}

async function invalider(id: string) {
  invalidationEnCoursId.value = id;
  try {
    await api.patch(`/documents-institutionnels/${id}/invalider`);
    await chargerDocuments();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Invalidation impossible";
  } finally {
    invalidationEnCoursId.value = null;
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Documents institutionnels scelles"
      description="Scellez cryptographiquement (hash SHA-256 + signature Ed25519 + QR) tout document officiel qui n'est pas une convention de vente — verifiable ensuite par n'importe qui via le Scanner Anti-Fraude."
    >
      <template #icone><FileBadge :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <div class="rounded-carte border border-bordure bg-surface p-4 shadow-carte">
      <h2 class="mb-3 text-sm font-semibold text-texte">Sceller un nouveau document</h2>
      <div class="space-y-2.5">
        <BaseInput id="titre-document" v-model="titre" label="Titre du document" />
        <div>
          <label for="type-document" class="mb-1 block text-xs font-medium text-texte">Type</label>
          <select id="type-document" v-model="type" class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte">
            <option v-for="(libelle, cle) in LIBELLE_TYPE_DOCUMENT_INSTITUTIONNEL" :key="cle" :value="cle">{{ libelle }}</option>
          </select>
        </div>
        <div>
          <label for="description-document" class="mb-1 block text-xs font-medium text-texte">Description (optionnelle)</label>
          <textarea
            id="description-document"
            v-model="description"
            rows="2"
            class="w-full rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte"
          />
        </div>
        <div>
          <label for="fichier-document" class="mb-1 block text-xs font-medium text-texte">Document numerise (optionnel)</label>
          <input id="fichier-document" type="file" class="w-full text-xs text-texte" @change="surChoixFichier" />
        </div>
        <BaseButton taille="sm" :disabled="enScellement || titre.length < 3" @click="sceller">Sceller le document</BaseButton>
      </div>
    </div>

    <div>
      <h2 class="mb-3 font-semibold text-texte">Documents scelles</h2>
      <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement...</p>
      <p v-else-if="documents.length === 0" class="text-sm text-texte-attenue">Aucun document scelle pour le moment.</p>
      <div v-else class="overflow-x-auto rounded-carte border border-bordure bg-surface">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
              <th class="px-4 py-3 font-semibold">Document</th>
              <th class="px-4 py-3 font-semibold">Statut</th>
              <th class="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-bordure">
            <tr v-for="d in documents" :key="d.id" class="align-top">
              <td class="px-4 py-3">
                <p class="font-medium text-texte">{{ d.titre }}</p>
                <p class="text-xs text-texte-attenue">
                  {{ LIBELLE_TYPE_DOCUMENT_INSTITUTIONNEL[d.type as TypeDocumentInstitutionnel] }} - emis par {{ d.emetteur.nomComplet }} le
                  {{ new Date(d.createdAt).toLocaleDateString("fr-FR") }}
                </p>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="d.valide ? 'bg-succes/10 text-succes' : 'bg-danger/10 text-danger'">
                  {{ d.valide ? "Valide" : "Invalide" }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-2 sm:flex-row">
                  <BaseButton taille="sm" variant="secondaire" @click="voirQr(d.id)">
                    <QrCode :size="14" aria-hidden="true" />
                    QR
                  </BaseButton>
                  <BaseButton v-if="d.valide" taille="sm" variant="danger" :disabled="invalidationEnCoursId === d.id" @click="invalider(d.id)">
                    <BadgeX :size="14" aria-hidden="true" />
                    Invalider
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <BaseModal :model-value="qrOuvertPourId !== null" titre="QR code du document" @update:model-value="qrOuvertPourId = null; qrDataUrl = null">
      <div class="flex flex-col items-center gap-3">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR code du document scelle" class="h-56 w-56" />
        <p class="text-xs text-texte-attenue">A apposer sur le document papier - verifiable via le Scanner Anti-Fraude.</p>
      </div>
    </BaseModal>
  </div>
</template>
