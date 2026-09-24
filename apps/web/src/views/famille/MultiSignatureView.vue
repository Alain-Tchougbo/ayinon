<script setup lang="ts">
import { CircleCheck, Clock, Search, Send, Signature, Users, X } from "@lucide/vue";
import { RoleFamilial, RoleUtilisateur, type ActionEnAttenteDto } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { mettreEnFileAction } from "../../services/syncService";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";
import { useOnlineStatus } from "../../composables/useOnlineStatus";
import BaseButton from "../../components/ui/BaseButton.vue";
import BaseCard from "../../components/ui/BaseCard.vue";
import BaseInput from "../../components/ui/BaseInput.vue";
import PageHeader from "../../components/ui/PageHeader.vue";

interface SignatureFamille {
  id: string;
  role: string;
  statut: "EN_ATTENTE" | "SIGNEE" | "REFUSEE";
  mandataire: { proprietaireId: string; proprietaire: { nomComplet: string } };
}
interface BanOpposition {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  oppositions: Array<{ opposantNom: string; motif: string; createdAt: string }>;
}
interface EtatParcelle {
  signatures: SignatureFamille[];
  quorumAtteint: boolean;
  bans: BanOpposition[];
}
interface SignatureEnAttente {
  id: string;
  role: string;
  parcelle: { id: string; nup: string; commune: string };
}

const auth = useAuthStore();
const route = useRoute();
const parcelles = useParcellesStore();
const { enLigne } = useOnlineStatus();

const mesSignaturesEnAttente = ref<SignatureEnAttente[]>([]);
const chargementMesSignatures = ref(false);

const nupRecherche = ref("");
const parcelleId = ref<string | null>(null);
const etat = ref<EtatParcelle | null>(null);
const erreur = ref<string | null>(null);
const message = ref<string | null>(null);

const codeOtp = ref("");
const codeOtpDebug = ref<string | null>(null);

const opposantNom = ref("");
const opposantContact = ref("");
const motifOpposition = ref("");

onMounted(async () => {
  parcelles.chargerToutes();

  if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
    chargementMesSignatures.value = true;
    try {
      mesSignaturesEnAttente.value = await api.get<SignatureEnAttente[]>("/familles/mes-signatures-en-attente");
    } finally {
      chargementMesSignatures.value = false;
    }
  }

  // Lien direct depuis l'accueil personnalise (?parcelle=<id>) : ouvre directement l'etat, sans recherche NUP.
  const parcelleDepuisLien = route.query.parcelle;
  if (typeof parcelleDepuisLien === "string") {
    parcelleId.value = parcelleDepuisLien;
    await chargerEtat();
  }
});

async function ouvrirDepuisSignatureEnAttente(signature: SignatureEnAttente) {
  parcelleId.value = signature.parcelle.id;
  nupRecherche.value = signature.parcelle.nup;
  await chargerEtat();
}

async function chercherParcelle() {
  erreur.value = null;
  const resultats = await parcelles.rechercher({ nup: nupRecherche.value });
  if (resultats.length === 0) {
    erreur.value = "Aucune parcelle trouvee pour ce NUP";
    return;
  }
  parcelleId.value = resultats[0]!.id;
  await chargerEtat();
}

async function chargerEtat() {
  if (!parcelleId.value) return;
  etat.value = await api.get<EtatParcelle>(`/familles/parcelles/${parcelleId.value}/etat`);
}

const maSignatureEnAttente = computed(() =>
  etat.value?.signatures.find((s) => s.mandataire.proprietaireId === auth.utilisateur?.proprietaireId && s.statut === "EN_ATTENTE"),
);

const banOuvert = computed(() => etat.value?.bans.find((b) => b.statut === "OUVERT"));

const ICONE_STATUT = { SIGNEE: CircleCheck, EN_ATTENTE: Clock, REFUSEE: X } as const;
const CLASSE_STATUT = {
  SIGNEE: "bg-succes/10 text-succes",
  EN_ATTENTE: "bg-accent/10 text-accent",
  REFUSEE: "bg-danger/10 text-danger",
} as const;

async function demanderOtp() {
  message.value = null;
  const reponse = await api.post<{ message: string; codeDebug?: string }>("/familles/otp-signature");
  message.value = reponse.message;
  codeOtpDebug.value = reponse.codeDebug ?? null;
}

async function retirerDeMesSignatures(signatureFamilleId: string) {
  mesSignaturesEnAttente.value = mesSignaturesEnAttente.value.filter((s) => s.id !== signatureFamilleId);
}

async function signer(accepte: boolean) {
  if (!maSignatureEnAttente.value) return;
  erreur.value = null;
  try {
    await api.post("/familles/signer", { signatureFamilleId: maSignatureEnAttente.value.id, accepte, codeOtp: codeOtp.value });
    await retirerDeMesSignatures(maSignatureEnAttente.value.id);
    codeOtp.value = "";
    await chargerEtat();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Signature impossible";
  }
}

async function deposerOpposition() {
  if (!banOuvert.value) return;
  erreur.value = null;
  message.value = null;
  const dto: ActionEnAttenteDto = {
    idLocal: crypto.randomUUID(),
    type: "DEPOSER_OPPOSITION",
    dto: { banId: banOuvert.value.id, opposantNom: opposantNom.value, opposantContact: opposantContact.value, motif: motifOpposition.value },
  };

  if (!enLigne.value) {
    await mettreEnFileAction(dto);
    message.value = "Vous etes hors-ligne : votre opposition est enregistree localement et sera transmise des le retour du reseau.";
    return;
  }

  try {
    await api.post("/familles/oppositions", dto.dto);
    message.value = "Opposition enregistree.";
    await chargerEtat();
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "Depot impossible";
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
    <PageHeader
      titre="Multi-signature familiale & affichage de ban"
      description="Pour une terre hereditaire, la mise en vente exige le consensus numerique de l'Aine, de la Representante des femmes et d'au moins un Cadet, puis 15 jours d'affichage public d'opposition."
    >
      <template #icone><Users :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <!-- Ce qui vous attend concretement : pas besoin de connaitre un NUP pour savoir qu'on attend votre signature. -->
    <BaseCard v-if="auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL" accentue="accent">
      <p class="mb-3 flex items-center gap-2 font-semibold text-texte">
        <Signature :size="18" class="text-accent" aria-hidden="true" />
        Vos signatures en attente
      </p>
      <p v-if="chargementMesSignatures" class="text-sm text-texte-attenue" role="status">Chargement…</p>
      <p v-else-if="mesSignaturesEnAttente.length === 0" class="text-sm text-texte-attenue">
        Aucune signature ne vous est demandee pour le moment.
      </p>
      <ul v-else class="space-y-2">
        <li
          v-for="s in mesSignaturesEnAttente"
          :key="s.id"
          class="flex items-center justify-between gap-2 rounded-carte border border-bordure bg-surface p-3"
        >
          <div class="text-sm">
            <p class="font-medium text-texte">{{ s.parcelle.nup }} — {{ s.parcelle.commune }}</p>
            <p class="text-xs text-texte-attenue">En tant que {{ s.role }}</p>
          </div>
          <BaseButton taille="sm" @click="ouvrirDepuisSignatureEnAttente(s)">Voir et signer</BaseButton>
        </li>
      </ul>
    </BaseCard>

    <details class="rounded-carte border border-bordure bg-surface p-3.5">
      <summary class="cursor-pointer text-sm font-medium text-texte">Rechercher une autre parcelle par NUP</summary>
      <form class="mt-3 flex gap-2" @submit.prevent="chercherParcelle">
        <div class="relative flex-1">
          <Search :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texte-attenue" aria-hidden="true" />
          <input
            v-model="nupRecherche"
            type="text"
            placeholder="NUP de la parcelle familiale"
            class="w-full rounded-carte border border-bordure bg-fond py-2.5 pl-10 pr-3 text-sm text-texte"
          />
        </div>
        <BaseButton type="submit" variant="secondaire">Rechercher</BaseButton>
      </form>
    </details>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger" role="alert">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes" role="status">{{ message }}</p>

    <div v-if="etat" class="space-y-4">
      <BaseCard>
        <p class="mb-3 font-semibold text-texte">Signatures des mandataires</p>
        <ul class="space-y-2.5 text-sm">
          <li v-for="s in etat.signatures" :key="s.id" class="flex items-center justify-between">
            <span class="text-texte">{{ s.mandataire.proprietaire.nomComplet }} ({{ s.role }})</span>
            <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="CLASSE_STATUT[s.statut]">
              <component :is="ICONE_STATUT[s.statut]" :size="12" aria-hidden="true" />
              {{ s.statut }}
            </span>
          </li>
        </ul>
        <p class="mt-4 flex items-center gap-1.5 text-sm font-medium" :class="etat.quorumAtteint ? 'text-succes' : 'text-texte-attenue'">
          <CircleCheck v-if="etat.quorumAtteint" :size="16" aria-hidden="true" />
          {{ etat.quorumAtteint ? "Quorum atteint — periode d'opposition ouverte" : "En attente de toutes les signatures" }}
        </p>
      </BaseCard>

      <BaseCard v-if="auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL && maSignatureEnAttente">
        <p class="mb-3 font-semibold text-texte">Votre signature est requise ({{ maSignatureEnAttente.role }})</p>
        <BaseButton taille="sm" variant="secondaire" @click="demanderOtp">Recevoir mon code de confirmation</BaseButton>
        <span v-if="codeOtpDebug" class="ml-2 text-xs text-texte-attenue">(demo : code = {{ codeOtpDebug }})</span>
        <div class="mt-3 flex flex-wrap items-end gap-2.5">
          <div class="w-40">
            <BaseInput id="code-signature" v-model="codeOtp" label="Code a 6 chiffres" :maxlength="6" placeholder="000000" />
          </div>
          <BaseButton taille="sm" variant="succes" @click="signer(true)">Approuver</BaseButton>
          <BaseButton taille="sm" variant="danger" @click="signer(false)">Refuser</BaseButton>
        </div>
      </BaseCard>

      <BaseCard v-if="banOuvert" accentue="accent">
        <p class="font-semibold text-texte">Affichage de ban en cours</p>
        <p class="mt-1 text-sm text-texte-attenue">
          Ouvert le {{ new Date(banOuvert.dateDebut).toLocaleDateString("fr-FR") }}, clos le
          {{ new Date(banOuvert.dateFin).toLocaleDateString("fr-FR") }}.
        </p>

        <form class="mt-4 space-y-2.5" @submit.prevent="deposerOpposition">
          <p class="text-sm font-medium text-texte">Vous etes voisin et souhaitez vous opposer ?</p>
          <BaseInput id="opposant-nom" v-model="opposantNom" label="Votre nom" required />
          <BaseInput id="opposant-contact" v-model="opposantContact" label="Telephone" required />
          <div>
            <label for="motif" class="mb-1 block text-sm font-medium text-texte">Motif de l'opposition</label>
            <textarea
              id="motif"
              v-model="motifOpposition"
              required
              rows="2"
              class="w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 text-sm text-texte"
            />
          </div>
          <BaseButton type="submit" variant="secondaire">
            <Send :size="15" aria-hidden="true" />
            Deposer une opposition
          </BaseButton>
        </form>

        <ul v-if="banOuvert.oppositions.length > 0" class="mt-4 space-y-1 border-t border-bordure pt-3 text-xs text-texte-attenue">
          <li v-for="(o, i) in banOuvert.oppositions" :key="i">{{ o.opposantNom }} — {{ o.motif }}</li>
        </ul>
      </BaseCard>
    </div>
  </div>
</template>
