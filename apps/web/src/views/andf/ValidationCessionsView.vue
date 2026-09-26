<script setup lang="ts">
import { Award, BadgeCheck, CircleX } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface Cession {
  id: string;
  vendeurNom: string;
  acquereurNom: string;
  montantFcfa: number;
  dateAcceptation: string;
  parcelle: { nup: string; commune: string };
}

const { definirPhraseCourante } = useVoiceAssistant();
const cessions = ref<Cession[]>([]);
const chargement = ref(true);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);
const rejetEnCoursId = ref<string | null>(null);
const motifRejetParCession = ref<Record<string, string>>({});

onMounted(async () => {
  definirPhraseCourante(PHRASES.validationCessionsIntro);
  await charger();
});

async function charger() {
  chargement.value = true;
  erreur.value = null;
  try {
    cessions.value = await api.get<Cession[]>("/cessions/a-valider");
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible de charger les cessions a valider";
  } finally {
    chargement.value = false;
  }
}

async function valider(id: string, approuver: boolean) {
  erreur.value = null;
  message.value = null;
  const motifRejet = motifRejetParCession.value[id]?.trim();
  if (!approuver && (!motifRejet || motifRejet.length < 10)) {
    erreur.value = "Le motif de rejet doit compter au moins 10 caracteres";
    return;
  }
  try {
    await api.patch(`/cessions/${id}/valider`, { approuver, motifRejet });
    message.value = approuver ? "Cession validee : titre delivre et propriete transferee." : "Cession rejetee.";
    rejetEnCoursId.value = null;
    delete motifRejetParCession.value[id];
    await charger();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Operation impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Validation des cessions foncieres"
      description="Chaque cession acceptee par l'acquereur attend votre validation : elle delivre alors le titre numerique et transfere la propriete."
    >
      <template #icone><BadgeCheck :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <p v-if="chargement" class="text-sm text-texte-attenue" role="status">Chargement…</p>
    <p v-else-if="cessions.length === 0" class="rounded-carte border border-dashed border-bordure p-4 text-sm text-texte-attenue">
      Aucune cession en attente de validation.
    </p>

    <ul v-else class="space-y-3">
      <li v-for="c in cessions" :key="c.id">
        <BaseCard>
          <p class="font-semibold text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
          <p class="mt-0.5 text-sm text-texte-attenue">
            {{ c.vendeurNom }} cede a {{ c.acquereurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA
          </p>
          <p class="mt-0.5 text-xs text-texte-attenue">Acceptee le {{ new Date(c.dateAcceptation).toLocaleDateString("fr-FR") }}</p>

          <div v-if="rejetEnCoursId !== c.id" class="mt-3.5 flex gap-2">
            <BaseButton taille="sm" @click="valider(c.id, true)">
              <Award :size="14" aria-hidden="true" />
              Valider et delivrer le titre
            </BaseButton>
            <BaseButton taille="sm" variant="secondaire" @click="rejetEnCoursId = c.id">
              <CircleX :size="14" aria-hidden="true" />
              Rejeter
            </BaseButton>
          </div>
          <div v-else class="mt-3.5 space-y-2 rounded-carte border border-bordure bg-fond p-3">
            <label :for="`motif-rejet-${c.id}`" class="block text-xs font-medium text-texte">Motif du rejet (obligatoire)</label>
            <textarea
              :id="`motif-rejet-${c.id}`"
              v-model="motifRejetParCession[c.id]"
              rows="2"
              placeholder="Ex. incoherence avec le registre cadastral"
              class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
            />
            <div class="flex gap-2">
              <BaseButton taille="sm" variant="danger" @click="valider(c.id, false)">Confirmer le rejet</BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="rejetEnCoursId = null">Annuler</BaseButton>
            </div>
          </div>
        </BaseCard>
      </li>
    </ul>
  </div>
</template>
