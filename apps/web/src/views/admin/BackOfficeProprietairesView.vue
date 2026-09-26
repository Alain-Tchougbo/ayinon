<script setup lang="ts">
import { Pencil, UserRoundSearch } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import BaseModal from "../../components/ui/BaseModal.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface Proprietaire {
  id: string;
  nomComplet: string;
  email: string | null;
  telephone: string | null;
  estDiaspora: boolean;
  nombreParcelles: number;
}

const { definirPhraseCourante } = useVoiceAssistant();
const proprietaires = ref<Proprietaire[]>([]);
const chargement = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const editionEnCours = ref<string | null>(null);
const emailEdition = ref("");
const telephoneEdition = ref("");

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    proprietaires.value = await api.get<Proprietaire[]>("/admin/proprietaires");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Chargement impossible";
  } finally {
    chargement.value = false;
  }
}

onMounted(() => {
  definirPhraseCourante(PHRASES.adminProprietairesIntro);
  charger();
});

function ouvrirEdition(p: Proprietaire) {
  editionEnCours.value = p.id;
  emailEdition.value = p.email ?? "";
  telephoneEdition.value = p.telephone ?? "";
}

async function enregistrerEdition(id: string) {
  erreur.value = null;
  message.value = null;
  try {
    await api.patch(`/admin/proprietaires/${id}`, { email: emailEdition.value || null, telephone: telephoneEdition.value || null });
    message.value = "Proprietaire mis a jour.";
    editionEnCours.value = null;
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Mise a jour impossible";
  }
}
</script>

<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <PageHeader titre="Proprietaires" description="Registre des proprietaires : corrigez une coordonnee de contact si necessaire.">
      <template #icone><UserRoundSearch :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>
    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>

    <div v-if="!chargement" class="overflow-x-auto rounded-carte border border-bordure bg-surface">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-bordure bg-fond/60 text-xs font-semibold uppercase tracking-wide text-texte-attenue">
            <th class="px-4 py-3 font-semibold">Proprietaire</th>
            <th class="px-4 py-3 font-semibold">Contact</th>
            <th class="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-bordure">
          <template v-for="p in proprietaires" :key="p.id">
            <tr class="align-top">
              <td class="px-4 py-3">
                <p class="font-medium text-texte">{{ p.nomComplet }}<span v-if="p.estDiaspora" class="ml-2 text-xs font-semibold text-accent">Diaspora</span></p>
                <p class="text-xs text-texte-attenue">{{ p.nombreParcelles }} parcelle(s)</p>
              </td>
              <td class="px-4 py-3 text-xs text-texte-attenue">{{ p.email ?? "—" }}<span v-if="p.telephone"> — {{ p.telephone }}</span></td>
              <td class="px-4 py-3">
                <BaseButton taille="sm" variant="secondaire" @click="ouvrirEdition(p)">
                  <Pencil :size="13" aria-hidden="true" />
                  Modifier
                </BaseButton>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <BaseModal :model-value="editionEnCours !== null" titre="Modifier le proprietaire" @update:model-value="editionEnCours = null">
      <div class="space-y-3">
        <BaseInput id="email-edition" v-model="emailEdition" label="Email" type="email" />
        <BaseInput id="telephone-edition" v-model="telephoneEdition" label="Telephone" />
        <div class="flex gap-2">
          <BaseButton taille="sm" @click="enregistrerEdition(editionEnCours!)">Enregistrer</BaseButton>
          <BaseButton taille="sm" variant="secondaire" @click="editionEnCours = null">Annuler</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
