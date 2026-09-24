<script setup lang="ts">
import { VerifierConventionSchema, type VerifierConventionDto } from "@ayinon/shared";
import jsQR from "jsqr";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ApiError, api } from "../../services/api";
import { verifierSignatureLocale } from "../../services/edVerify";
import { PHRASES } from "../../voice/phrases";
import { useVoiceAssistant } from "../../composables/useVoiceAssistant";

interface ResultatVerification {
  authentique: boolean;
  motif?: string;
  convention?: { vendeurNom: string; acquereurNom: string; montantFcfa: number; creeLe: string };
}

const { lire } = useVoiceAssistant();

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
                motif: "Signature cryptographique valide (verification locale hors-ligne — non confirmee aupres du registre national).",
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

onMounted(() => {
  lire(PHRASES.scannerIntro);
});
onBeforeUnmount(arreterCamera);
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 p-4">
    <h1 class="text-xl font-bold text-primaire">Scanner Anti-Fraude</h1>
    <p class="text-sm text-texte-attenue">
      Scannez le QR code appose sur une convention de vente papier pour verifier instantanement, hors ligne ou en
      ligne, si le document est authentique.
    </p>

    <div class="overflow-hidden rounded-carte border border-bordure bg-black">
      <video ref="video" class="aspect-video w-full object-cover" muted playsinline />
      <canvas ref="canvas" class="hidden" />
    </div>

    <div class="flex gap-2">
      <button
        v-if="!enCoursDeScan"
        type="button"
        class="rounded-carte bg-primaire px-4 py-2 text-sm font-semibold text-primaire-contraste"
        @click="demarrerCamera"
      >
        📷 Activer la camera
      </button>
      <button v-else type="button" class="rounded-carte bg-fond px-4 py-2 text-sm font-semibold" @click="arreterCamera">
        Arreter
      </button>
    </div>

    <p v-if="erreurCamera" class="rounded-carte bg-accent/10 p-3 text-sm text-texte">{{ erreurCamera }}</p>

    <details class="rounded-carte border border-bordure p-3 text-sm">
      <summary class="cursor-pointer font-medium">Saisie manuelle (sans camera)</summary>
      <textarea
        v-model="saisieManuelle"
        rows="4"
        class="mt-2 w-full rounded-carte border border-bordure bg-surface p-2 text-xs"
        placeholder='{"payload":{...},"signatureEd25519":"..."}'
      />
      <button
        type="button"
        class="mt-2 rounded-carte bg-fond px-3 py-2 text-xs font-semibold"
        :disabled="enVerification"
        @click="verifierSaisieManuelle"
      >
        Verifier
      </button>
    </details>

    <div
      v-if="resultat"
      class="rounded-carte border p-4"
      :class="resultat.authentique ? 'border-succes bg-succes/10' : 'border-danger bg-danger/10'"
      role="alert"
    >
      <p class="text-lg font-bold" :class="resultat.authentique ? 'text-succes' : 'text-danger'">
        {{ resultat.authentique ? "✅ Document authentique" : "⚠️ Document non authentifie" }}
      </p>
      <p v-if="resultat.motif" class="mt-1 text-sm">{{ resultat.motif }}</p>
      <dl v-if="resultat.convention" class="mt-2 space-y-1 text-sm">
        <div><dt class="inline font-medium">Vendeur :</dt> <dd class="inline">{{ resultat.convention.vendeurNom }}</dd></div>
        <div><dt class="inline font-medium">Acquereur :</dt> <dd class="inline">{{ resultat.convention.acquereurNom }}</dd></div>
        <div>
          <dt class="inline font-medium">Montant :</dt>
          <dd class="inline">{{ resultat.convention.montantFcfa.toLocaleString("fr-FR") }} FCFA</dd>
        </div>
      </dl>
      <button
        type="button"
        class="mt-3 rounded-carte bg-surface px-3 py-2 text-xs font-semibold"
        @click="
          resultat = null;
          demarrerCamera();
        "
      >
        Scanner un autre document
      </button>
    </div>
  </div>
</template>
