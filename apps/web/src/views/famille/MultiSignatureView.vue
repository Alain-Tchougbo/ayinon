<script setup lang="ts">
import { RoleFamilial, RoleUtilisateur, type ActionEnAttenteDto } from "@ayinon/shared";
import { computed, onMounted, ref } from "vue";
import { mettreEnFileAction } from "../../services/syncService";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";
import { useParcellesStore } from "../../stores/parcelles.store";
import { useOnlineStatus } from "../../composables/useOnlineStatus";

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

const auth = useAuthStore();
const parcelles = useParcellesStore();
const { enLigne } = useOnlineStatus();

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

onMounted(() => parcelles.chargerToutes());

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

async function demanderOtp() {
  message.value = null;
  const reponse = await api.post<{ message: string; codeDebug?: string }>("/familles/otp-signature");
  message.value = reponse.message;
  codeOtpDebug.value = reponse.codeDebug ?? null;
}

async function signer(accepte: boolean) {
  if (!maSignatureEnAttente.value) return;
  erreur.value = null;
  try {
    await api.post("/familles/signer", { signatureFamilleId: maSignatureEnAttente.value.id, accepte, codeOtp: codeOtp.value });
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
  <div class="mx-auto max-w-3xl space-y-6 p-4">
    <div>
      <h1 class="text-xl font-bold text-primaire">Multi-signature familiale & affichage de ban</h1>
      <p class="mt-1 text-sm text-texte-attenue">
        Pour une terre hereditaire, la mise en vente exige le consensus numerique de l'Aine, de la Representante des
        femmes et d'au moins un Cadet, puis 15 jours d'affichage public d'opposition.
      </p>
    </div>

    <form class="flex gap-2" @submit.prevent="chercherParcelle">
      <input
        v-model="nupRecherche"
        type="text"
        placeholder="NUP de la parcelle familiale"
        class="flex-1 rounded-carte border border-bordure bg-surface px-3 py-2 text-sm"
      />
      <button type="submit" class="rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste">Rechercher</button>
    </form>

    <p v-if="erreur" class="rounded-carte bg-danger/10 p-3 text-sm text-danger">{{ erreur }}</p>
    <p v-if="message" class="rounded-carte bg-succes/10 p-3 text-sm text-succes">{{ message }}</p>

    <div v-if="etat" class="space-y-4">
      <div class="rounded-carte border border-bordure bg-surface p-4">
        <p class="mb-2 font-semibold">Signatures des mandataires</p>
        <ul class="space-y-2 text-sm">
          <li v-for="s in etat.signatures" :key="s.id" class="flex items-center justify-between">
            <span>{{ s.mandataire.proprietaire.nomComplet }} ({{ s.role }})</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="{
                'bg-succes/10 text-succes': s.statut === 'SIGNEE',
                'bg-accent/10 text-accent': s.statut === 'EN_ATTENTE',
                'bg-danger/10 text-danger': s.statut === 'REFUSEE',
              }"
            >
              {{ s.statut }}
            </span>
          </li>
        </ul>
        <p class="mt-3 text-sm font-medium" :class="etat.quorumAtteint ? 'text-succes' : 'text-texte-attenue'">
          {{ etat.quorumAtteint ? "✅ Quorum atteint — periode d'opposition ouverte" : "En attente de toutes les signatures" }}
        </p>
      </div>

      <div v-if="auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL && maSignatureEnAttente" class="rounded-carte border border-bordure bg-surface p-4">
        <p class="mb-2 font-semibold">Votre signature est requise ({{ maSignatureEnAttente.role }})</p>
        <button type="button" class="rounded-carte bg-fond px-3 py-2 text-xs font-semibold" @click="demanderOtp">
          Recevoir mon code de confirmation
        </button>
        <span v-if="codeOtpDebug" class="ml-2 text-xs text-texte-attenue">(demo : code = {{ codeOtpDebug }})</span>
        <div class="mt-2 flex items-center gap-2">
          <input v-model="codeOtp" maxlength="6" placeholder="Code a 6 chiffres" class="w-40 rounded-carte border border-bordure bg-fond px-3 py-2 text-sm" />
          <button type="button" class="rounded-carte bg-primaire px-3 py-2 text-xs font-semibold text-primaire-contraste" @click="signer(true)">
            Approuver
          </button>
          <button type="button" class="rounded-carte bg-danger px-3 py-2 text-xs font-semibold text-white" @click="signer(false)">
            Refuser
          </button>
        </div>
      </div>

      <div v-if="banOuvert" class="rounded-carte border border-accent bg-accent/10 p-4">
        <p class="font-semibold">Affichage de ban en cours</p>
        <p class="text-sm">Ouvert le {{ new Date(banOuvert.dateDebut).toLocaleDateString("fr-FR") }}, clos le {{ new Date(banOuvert.dateFin).toLocaleDateString("fr-FR") }}.</p>

        <form class="mt-3 space-y-2" @submit.prevent="deposerOpposition">
          <p class="text-sm font-medium">Vous etes voisin et souhaitez vous opposer ?</p>
          <input v-model="opposantNom" placeholder="Votre nom" required class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />
          <input v-model="opposantContact" placeholder="Telephone" required class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />
          <textarea v-model="motifOpposition" placeholder="Motif de l'opposition" required rows="2" class="w-full rounded-carte border border-bordure bg-surface px-3 py-2 text-sm" />
          <button type="submit" class="rounded-carte bg-danger px-3 py-2 text-xs font-semibold text-white">Deposer une opposition</button>
        </form>

        <ul v-if="banOuvert.oppositions.length > 0" class="mt-3 space-y-1 text-xs text-texte-attenue">
          <li v-for="(o, i) in banOuvert.oppositions" :key="i">{{ o.opposantNom }} — {{ o.motif }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
