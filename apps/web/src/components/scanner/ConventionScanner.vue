<script setup lang="ts">
import { CircleCheck, ScanLine, TriangleAlert } from "@lucide/vue";
import { VerifierConventionSchema, type VerifierConventionDto } from "@ayinon/shared";
import jsQR from "jsqr";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { verifierSignatureLocale } from "../../services/edVerify";
import { PHRASES } from "../../voice/phrases";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";
import BaseButton from "../ui/BaseButton.vue";
import BaseCard from "../ui/BaseCard.vue";
import PageHeader from "../ui/PageHeader.vue";

interface ResultatVerification {
  authentique: boolean;
  motif?: string;
  convention?: { vendeurNom: string; acquereurNom: string; montantFcfa: number; creeLe: string };
}

const { lire, definirPhraseCourante } = useVoiceAssistant();

const video = ref<HTMLVideoElement>();
const canvas = ref<HTMLCanvasElement>();
const enCoursDeScan = ref(false);
const erreurCamera = ref<string | null>(null);
const resultat = ref<ResultatVerification | null>(null);
const enVerification = ref(false);
const saisieManuelle = ref("");

let flux: MediaStream | null = null;
let idAnimation: number | null = null;

async function demarrerCamera() {
  erreurCamera.value = null;
  resultat.value = null;
  try {
    flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    if (video.value) {
      video.value.srcObject = flux;
      await video.value.play();
    }
    enCoursDeScan.value = true;
    boucleScan();
  } catch {
    erreurCamera.value =
      "Camera indisponible ou acces refuse. Vous pouvez coller le contenu du QR code manuellement ci-dessous.";
  }
}

function arreterCamera() {
  enCoursDeScan.value = false;
  if (idAnimation) cancelAnimationFrame(idAnimation);
  flux?.getTracks().forEach((piste) => piste.stop());
  flux = null;
}

function boucleScan() {
  if (!enCoursDeScan.value || !video.value || !canvas.value) return;
  const contexte = canvas.value.getContext("2d");

  if (video.value.readyState === video.value.HAVE_ENOUGH_DATA && contexte) {
    canvas.value.width = video.value.videoWidth;
    canvas.value.height = video.value.videoHeight;
    contexte.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);
    const image = contexte.getImageData(0, 0, canvas.value.width, canvas.value.height);
    const code = jsQR(image.data, image.width, image.height);
    if (code) {
      traiterContenuQr(code.data);
      return;
    }
  }
  idAnimation = requestAnimationFrame(boucleScan);
}

async function traiterContenuQr(contenu: string) {
  arreterCamera();
  try {
    const donnees = JSON.parse(contenu);
    await verifier(donnees);
  } catch {
    resultat.value = { authentique: false, motif: "QR code illisible ou format inattendu" };
  }
}

async function verifierSaisieManuelle() {
  try {
    const donnees = JSON.parse(saisieManuelle.value);
    await verifier(donnees);
  } catch {
    resultat.value = { authentique: false, motif: "Format JSON invalide" };
  }
}

async function verifier(donneesBrutes: unknown) {
  enVerification.value = true;
  resultat.value = null;
  try {
    const dto: VerifierConventionDto = VerifierConventionSchema.parse(donneesBrutes);

    if (!navigator.onLine) {
      // Zone blanche : pas d'appel serveur possible, on retombe sur la verification Ed25519
      // locale (Web Crypto API) a partir de la cle publique mise en cache (voir services/edVerify.ts).
      const localementValide = await verifierSignatureLocale(dto.payload, dto.signatureEd25519);
      resultat.value =
        localementValide === null
          ? { authentique: false, motif: "Hors-ligne et verification locale indisponible sur cet appareil : reessayez avec du reseau." }
          : localementValide
            ? {
                authentique: true,
                motif: "Signature cryptographique valide (verification locale hors-ligne - non confirmee aupres du registre national).",
              }
            : { authentique: false, motif: "Signature cryptographique invalide : document falsifie ou corrompu." };
    } else {
      resultat.value = await api.post<ResultatVerification>("/conventions/verifier", dto);
    }
    await lire(resultat.value.authentique ? PHRASES.scannerOk : PHRASES.scannerKo);
  } catch (e) {
    resultat.value = { authentique: false, motif: e instanceof ApiError ? e.message : "Erreur de verification" };
  } finally {
    enVerification.value = false;
  }
}

function relancer() {
  resultat.value = null;
  demarrerCamera();
}

onMounted(() => {
  // Pas de lecture automatique : seule l'action explicite ("Ecouter cette page", ou le resultat
  // d'un scan que l'utilisateur vient de declencher) doit faire parler l'assistant.
  definirPhraseCourante(PHRASES.scannerIntro);
});
onBeforeUnmount(arreterCamera);
</script>

<template>
  <div class="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
    <PageHeader
      titre="Scanner Anti-Fraude"
      description="Scannez le QR code appose sur une convention de vente papier pour verifier instantanement, hors ligne ou en ligne, si le document est authentique."
    >
      <template #icone><ScanLine :size="22" class="text-primaire" aria-hidden="true" /></template>
    </PageHeader>

    <div class="relative overflow-hidden rounded-carte border border-bordure bg-neutral-900 shadow-carte">
      <video ref="video" class="aspect-video w-full object-cover" muted playsinline />
      <canvas ref="canvas" class="hidden" />
      <div v-if="enCoursDeScan" class="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" aria-hidden="true" />
      <p v-if="!enCoursDeScan" class="absolute inset-0 flex items-center justify-center text-sm text-white/70">
        Camera en attente
      </p>
    </div>

    <div class="flex gap-2">
      <BaseButton v-if="!enCoursDeScan" @click="demarrerCamera">
        <ScanLine :size="18" aria-hidden="true" />
        Activer la camera
      </BaseButton>
      <BaseButton v-else variant="secondaire" @click="arreterCamera">Arreter</BaseButton>
    </div>

    <p v-if="erreurCamera" class="rounded-carte border border-accent/30 bg-accent/10 p-3 text-sm text-texte" role="status">
      {{ erreurCamera }}
    </p>

    <details class="rounded-carte border border-bordure bg-surface p-3.5 text-sm shadow-carte">
      <summary class="cursor-pointer font-medium text-texte">Saisie manuelle (sans camera)</summary>
      <textarea
        v-model="saisieManuelle"
        rows="4"
        class="mt-2.5 w-full rounded-carte border border-bordure bg-fond px-3.5 py-2.5 font-mono text-xs text-texte"
        placeholder='{"payload":{...},"signatureEd25519":"..."}'
      />
      <BaseButton taille="sm" variant="secondaire" class="mt-2.5" :disabled="enVerification" @click="verifierSaisieManuelle">
        Verifier
      </BaseButton>
    </details>

    <BaseCard v-if="resultat" :accentue="resultat.authentique ? 'succes' : 'danger'" role="alert">
      <p class="flex items-center gap-2 text-lg font-bold" :class="resultat.authentique ? 'text-succes' : 'text-danger'">
        <CircleCheck v-if="resultat.authentique" :size="22" aria-hidden="true" />
        <TriangleAlert v-else :size="22" aria-hidden="true" />
        {{ resultat.authentique ? "Document authentique" : "Document non authentifie" }}
      </p>
      <p v-if="resultat.motif" class="mt-1 text-sm text-texte">{{ resultat.motif }}</p>
      <dl v-if="resultat.convention" class="mt-3 space-y-1 text-sm">
        <div><dt class="inline font-medium">Vendeur :</dt> <dd class="inline">{{ resultat.convention.vendeurNom }}</dd></div>
        <div><dt class="inline font-medium">Acquereur :</dt> <dd class="inline">{{ resultat.convention.acquereurNom }}</dd></div>
        <div>
          <dt class="inline font-medium">Montant :</dt>
          <dd class="inline">{{ resultat.convention.montantFcfa.toLocaleString("fr-FR") }} FCFA</dd>
        </div>
      </dl>
      <BaseButton taille="sm" variant="secondaire" class="mt-3.5" @click="relancer">Scanner un autre document</BaseButton>
    </BaseCard>
  </div>
</template>
