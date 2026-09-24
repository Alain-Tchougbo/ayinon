<script setup lang="ts">
import { Award, Check, Handshake, Inbox, Send, X } from "@lucide/vue";
import { computed, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import { PHRASES } from "../../voice/phrases";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface UtilisateurResume {
  id: string;
  nomComplet: string;
  email: string;
}
interface Titre {
  id: string;
  numeroTitre: string;
  dateDelivrance: string;
  hashSha256: string;
}
interface Cession {
  id: string;
  parcelleId: string;
  vendeurNom: string;
  acquereurNom: string;
  montantFcfa: number;
  statutCession: "PROPOSEE" | "ACCEPTEE" | "VALIDEE" | "REJETEE";
  motifRejet: string | null;
  createdAt: string;
  parcelle: { nup: string; commune: string };
  acquereur: UtilisateurResume | null;
  titre: Titre | null;
}

const auth = useAuthStore();
const parcelles = useParcellesStore();
const { definirPhraseCourante } = useVoiceAssistant();

const mesParcelles = computed(() => parcelles.parcelles.filter((p) => p.proprietaireId === auth.utilisateur?.proprietaireId));

const parcelleEnProposition = ref<string | null>(null);
const acquereurEmail = ref("");
const montantFcfa = ref("");
const enCours = ref(false);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const propositionsRecues = ref<Cession[]>([]);
const cessionsEmises = ref<Cession[]>([]);
const motifRefusParCession = ref<Record<string, string>>({});
const refusEnCoursId = ref<string | null>(null);

const LIBELLE_STATUT: Record<Cession["statutCession"], string> = {
  PROPOSEE: "En attente de l'acquereur",
  ACCEPTEE: "Acceptee — en attente de validation ANDF",
  VALIDEE: "Validee — titre delivre",
  REJETEE: "Rejetee",
};
const COULEUR_STATUT: Record<Cession["statutCession"], string> = {
  PROPOSEE: "bg-accent/10 text-accent",
  ACCEPTEE: "bg-primaire/10 text-primaire",
  VALIDEE: "bg-succes/10 text-succes",
  REJETEE: "bg-danger/10 text-danger",
};

onMounted(async () => {
  definirPhraseCourante(PHRASES.cessionIntro);
  await parcelles.chargerToutes();
  await rafraichir();
});

async function rafraichir() {
  [propositionsRecues.value, cessionsEmises.value] = await Promise.all([
    api.get<Cession[]>("/cessions/mes-propositions-recues"),
    api.get<Cession[]>("/cessions/mes-cessions-emises"),
  ]);
}

async function proposerCession(parcelleId: string) {
  erreur.value = null;
  message.value = null;
  enCours.value = true;
  try {
    await api.post("/cessions", { parcelleId, acquereurEmail: acquereurEmail.value, montantFcfa: montantFcfa.value });
    message.value = "Proposition de cession envoyee. L'acquereur doit desormais l'accepter.";
    parcelleEnProposition.value = null;
    acquereurEmail.value = "";
    montantFcfa.value = "";
    await rafraichir();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Impossible d'envoyer la proposition";
  } finally {
    enCours.value = false;
  }
}

async function repondre(cessionId: string, accepter: boolean) {
  erreur.value = null;
  message.value = null;
  const motifRefus = motifRefusParCession.value[cessionId]?.trim();
  if (!accepter && (!motifRefus || motifRefus.length < 10)) {
    erreur.value = "Le motif de refus doit compter au moins 10 caracteres";
    return;
  }
  try {
    await api.patch(`/cessions/${cessionId}/repondre`, { accepter, motifRefus });
    message.value = accepter ? "Proposition acceptee : elle passe maintenant en validation ANDF." : "Proposition refusee.";
    refusEnCoursId.value = null;
    delete motifRefusParCession.value[cessionId];
    await rafraichir();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Reponse impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
    <PageHeader
      titre="Ceder ou acquerir un terrain"
      description="Proposez la vente d'une parcelle que vous possedez, ou repondez a une proposition qui vous est adressee. Chaque etape est scellee et tracee jusqu'a la delivrance du titre."
    >
      <template #icone><Handshake :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <!-- Propositions recues : je suis l'acquereur designe. -->
    <section v-if="propositionsRecues.length > 0">
      <h2 class="mb-3 flex items-center gap-2 text-lg font-semibold text-texte">
        <Inbox :size="18" class="text-accent" aria-hidden="true" />
        Propositions recues ({{ propositionsRecues.length }})
      </h2>
      <ul class="space-y-3">
        <li v-for="c in propositionsRecues" :key="c.id">
          <BaseCard accentue="accent">
            <p class="font-semibold text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
            <p class="mt-0.5 text-sm text-texte-attenue">Proposee par {{ c.vendeurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>

            <div v-if="refusEnCoursId !== c.id" class="mt-3 flex gap-2">
              <BaseButton taille="sm" @click="repondre(c.id, true)">
                <Check :size="14" aria-hidden="true" />
                Accepter
              </BaseButton>
              <BaseButton taille="sm" variant="secondaire" @click="refusEnCoursId = c.id">
                <X :size="14" aria-hidden="true" />
                Refuser
              </BaseButton>
            </div>
            <div v-else class="mt-3 space-y-2 rounded-carte border border-bordure bg-fond p-3">
              <label :for="`motif-refus-${c.id}`" class="block text-xs font-medium text-texte">Motif du refus (obligatoire)</label>
              <textarea
                :id="`motif-refus-${c.id}`"
                v-model="motifRefusParCession[c.id]"
                rows="2"
                placeholder="Ex. montant propose trop bas"
                class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-xs text-texte"
              />
              <div class="flex gap-2">
                <BaseButton taille="sm" variant="danger" @click="repondre(c.id, false)">Confirmer le refus</BaseButton>
                <BaseButton taille="sm" variant="secondaire" @click="refusEnCoursId = null">Annuler</BaseButton>
              </div>
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>

    <!-- Vos parcelles : proposer une cession. -->
    <section>
      <h2 class="mb-3 font-semibold text-texte">Vos parcelles</h2>
      <ul class="space-y-3">
        <li v-for="p in mesParcelles" :key="p.id">
          <BaseCard>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ p.nup }}</p>
                <p class="text-sm text-texte-attenue">{{ p.commune }} — {{ p.superficieM2.toLocaleString("fr-FR") }} m²</p>
              </div>
              <span
                v-if="p.verrouAntiVente"
                class="rounded-full bg-succes/10 px-3 py-1 text-xs font-semibold text-succes"
                title="Deverrouillez depuis le Passeport foncier avant de ceder"
              >
                Verrouillee
              </span>
            </div>

            <div v-if="parcelleEnProposition === p.id" class="mt-4 space-y-2.5">
              <BaseInput id="acquereur-email" v-model="acquereurEmail" type="email" label="E-mail de l'acquereur (doit avoir un compte AYINON)" />
              <BaseInput id="montant-fcfa" v-model="montantFcfa" type="number" label="Montant convenu (FCFA)" />
              <div class="flex gap-2">
                <BaseButton
                  taille="sm"
                  :disabled="enCours || !acquereurEmail || !montantFcfa"
                  @click="proposerCession(p.id)"
                >
                  <Send :size="14" aria-hidden="true" />
                  Envoyer la proposition
                </BaseButton>
                <BaseButton taille="sm" variant="secondaire" @click="parcelleEnProposition = null">Annuler</BaseButton>
              </div>
            </div>
            <BaseButton
              v-else
              taille="sm"
              variant="secondaire"
              class="mt-4"
              :disabled="p.verrouAntiVente"
              @click="parcelleEnProposition = p.id"
            >
              Proposer une cession
            </BaseButton>
          </BaseCard>
        </li>
        <li v-if="mesParcelles.length === 0" class="text-sm text-texte-attenue">Aucune parcelle associee a votre compte pour le moment.</li>
      </ul>
    </section>

    <!-- Historique des cessions que j'ai proposees. -->
    <section v-if="cessionsEmises.length > 0">
      <h2 class="mb-3 font-semibold text-texte">Vos cessions en cours</h2>
      <ul class="space-y-3">
        <li v-for="c in cessionsEmises" :key="c.id">
          <BaseCard rembourrage="sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="font-semibold text-texte">{{ c.parcelle.nup }} — {{ c.parcelle.commune }}</p>
                <p class="text-xs text-texte-attenue">Vers {{ c.acquereur?.nomComplet ?? c.acquereurNom }} — {{ c.montantFcfa.toLocaleString("fr-FR") }} FCFA</p>
              </div>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="COULEUR_STATUT[c.statutCession]">
                {{ LIBELLE_STATUT[c.statutCession] }}
              </span>
            </div>
            <p v-if="c.statutCession === 'REJETEE' && c.motifRejet" class="mt-1.5 text-xs text-danger">Motif : {{ c.motifRejet }}</p>
            <div v-if="c.titre" class="mt-2.5 flex items-center gap-2 rounded-carte bg-succes/10 px-3 py-2 text-xs font-semibold text-succes">
              <Award :size="14" aria-hidden="true" />
              Titre {{ c.titre.numeroTitre }} delivre le {{ new Date(c.titre.dateDelivrance).toLocaleDateString("fr-FR") }}
            </div>
          </BaseCard>
        </li>
      </ul>
    </section>
  </div>
</template>
