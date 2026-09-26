<script setup lang="ts">
import { Bot, Send, Sparkles, X } from "@lucide/vue";
import { nextTick, ref, watch } from "vue";
import { ApiError, api } from "../../services/api";
import { useAuthStore } from "../../stores/auth.store";

interface MessageAffiche {
  role: "utilisateur" | "assistant";
  contenu: string;
}

const CLE_SESSION = "ayinon_chat_session";

/** Amorces concretes (pas des questions au hasard) : chacune correspond a un outil reellement
 * cable cote serveur (voir chatbot-tools.service.ts), donc le premier echange est toujours utile. */
const SUGGESTIONS = [
  "Comment verifier la fiabilite d'une parcelle ?",
  "Quelles annonces sont disponibles a Cotonou ?",
  "Estimer les frais de mutation pour un achat",
  "Quel est le prix moyen au m² dans une commune ?",
];

const auth = useAuthStore();
const ouvert = ref(false);
const messages = ref<MessageAffiche[]>([]);
const saisie = ref("");
const enCours = ref(false);
const erreur = ref<string | null>(null);
const conversationId = ref<string | null>(null);
const zoneMessages = ref<HTMLDivElement>();

function idSessionAnonyme(): string {
  let id = localStorage.getItem(CLE_SESSION);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLE_SESSION, id);
  }
  return id;
}

// Une conversation anonyme n'appartient pas au compte qui vient de se connecter (et inversement) :
// repartir de zero au changement d'etat evite un 403 "conversation ne vous appartient pas" cote API.
watch(
  () => auth.estConnecte,
  () => {
    conversationId.value = null;
    messages.value = [];
  },
);

async function defilerVersLeBas() {
  await nextTick();
  zoneMessages.value?.scrollTo({ top: zoneMessages.value.scrollHeight });
}

async function envoyer(texteSuggere?: string) {
  const texte = (texteSuggere ?? saisie.value).trim();
  if (!texte || enCours.value) return;
  erreur.value = null;
  messages.value.push({ role: "utilisateur", contenu: texte });
  saisie.value = "";
  enCours.value = true;
  await defilerVersLeBas();
  try {
    const entetes = auth.estConnecte ? undefined : { "X-Chat-Session-Id": idSessionAnonyme() };
    const reponse = await api.post<{ conversationId: string; reponse: string }>(
      "/chatbot/messages",
      { conversationId: conversationId.value ?? undefined, message: texte },
      entetes,
    );
    conversationId.value = reponse.conversationId;
    messages.value.push({ role: "assistant", contenu: reponse.reponse });
  } catch (e) {
    erreur.value = e instanceof ApiError ? e.message : "L'assistant est momentanement indisponible.";
  } finally {
    enCours.value = false;
    await defilerVersLeBas();
  }
}

function basculer() {
  ouvert.value = !ouvert.value;
}
</script>

<template>
  <div class="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
    <div
      v-if="ouvert"
      class="flex h-[28rem] w-[20rem] max-w-[90vw] flex-col overflow-hidden rounded-carte border border-bordure bg-surface shadow-flottant"
    >
      <div class="flex items-center justify-between border-b border-bordure px-3.5 py-2.5">
        <p class="flex items-center gap-1.5 text-sm font-semibold text-texte">
          <Sparkles :size="14" class="text-accent" aria-hidden="true" />
          Assistant AYINON
        </p>
        <button type="button" class="min-h-0 text-texte-attenue hover:text-texte" aria-label="Fermer l'assistant" @click="basculer">
          <X :size="16" aria-hidden="true" />
        </button>
      </div>

      <div ref="zoneMessages" class="flex-1 space-y-2.5 overflow-y-auto p-3.5">
        <template v-if="messages.length === 0">
          <p class="text-xs text-texte-attenue">
            Posez une question sur une parcelle, une annonce ou les frais de mutation — je m'appuie uniquement sur les donnees reelles
            d'AYINON, jamais sur une information inventee.
          </p>
          <div class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="suggestion in SUGGESTIONS"
              :key="suggestion"
              type="button"
              class="min-h-0 rounded-full border border-bordure bg-fond px-2.5 py-1.5 text-left text-xs text-texte transition-colors hover:border-primaire hover:text-primaire"
              @click="envoyer(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </template>
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="max-w-[85%] whitespace-pre-line rounded-carte px-3 py-2 text-sm"
          :class="m.role === 'utilisateur' ? 'ml-auto bg-primaire text-primaire-contraste' : 'bg-fond text-texte'"
        >
          {{ m.contenu }}
        </div>
        <p v-if="enCours" class="text-xs text-texte-attenue" role="status">L'assistant reflechit…</p>
      </div>

      <p v-if="erreur" class="border-t border-bordure px-3.5 py-2 text-xs text-danger" role="alert">{{ erreur }}</p>

      <form class="flex items-center gap-2 border-t border-bordure p-2.5" @submit.prevent="envoyer()">
        <input
          v-model="saisie"
          type="text"
          placeholder="Votre question…"
          class="min-h-0 flex-1 rounded-carte border border-bordure bg-fond px-3 py-2 text-sm text-texte"
          :disabled="enCours"
        />
        <button
          type="submit"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primaire text-primaire-contraste disabled:opacity-50"
          :disabled="enCours || !saisie.trim()"
          aria-label="Envoyer"
        >
          <Send :size="15" aria-hidden="true" />
        </button>
      </form>
    </div>

    <button
      type="button"
      class="relative flex h-14 w-14 items-center justify-center rounded-full bg-primaire text-primaire-contraste shadow-flottant transition-colors hover:bg-primaire-hover"
      :aria-label="ouvert ? 'Fermer l\'assistant AYINON' : 'Ouvrir l\'assistant AYINON'"
      :aria-pressed="ouvert"
      @click="basculer"
    >
      <X v-if="ouvert" :size="22" aria-hidden="true" />
      <template v-else>
        <Bot :size="22" aria-hidden="true" />
        <Sparkles :size="12" class="absolute -right-0.5 -top-0.5 rounded-full bg-accent p-0.5 text-accent-contraste" aria-hidden="true" />
      </template>
    </button>
  </div>
</template>
