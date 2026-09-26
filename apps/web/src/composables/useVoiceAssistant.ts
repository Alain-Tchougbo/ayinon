import { LangueAssistantVocal } from "@ayinon/shared";
import { ref } from "vue";
import { PHRASES, type PhraseVocale } from "../voice/phrases";

const CLE_STOCKAGE_LANGUE = "ayinon_langue_vocale";

const languePreferee = ref<LangueAssistantVocal>(
  (localStorage.getItem(CLE_STOCKAGE_LANGUE) as LangueAssistantVocal | null) ?? LangueAssistantVocal.FR,
);
const enLecture = ref(false);
/** Phrase associee a la vue actuellement affichee (definie par chaque vue via definirPhraseCourante). */
const phraseCourante = ref<PhraseVocale>(PHRASES.bienvenue);
/**
 * true juste apres une lecture ayant bascule en francais faute d'enregistrement dans la langue
 * choisie : l'interface doit le signaler explicitement (voir VoiceAssistantButton), jamais rester
 * silencieuse sur le fait qu'elle n'a pas parle dans la langue demandee.
 */
const dernierRepliFrancais = ref(false);

function definirLangue(langue: LangueAssistantVocal) {
  languePreferee.value = langue;
  localStorage.setItem(CLE_STOCKAGE_LANGUE, langue);
}

/** Cherche un enregistrement natif pre-produit ; renvoie false s'il n'existe pas encore (repli FR). */
async function jouerAudioPreEnregistre(phraseId: string, langue: LangueAssistantVocal): Promise<boolean> {
  const chemin = `/audio/${langue.toLowerCase()}/${phraseId}.mp3`;
  try {
    const test = await fetch(chemin, { method: "HEAD" });
    if (!test.ok) return false;
    const audio = new Audio(chemin);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

function parlerFrancais(texte: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  utterance.onstart = () => (enLecture.value = true);
  utterance.onend = () => (enLecture.value = false);
  window.speechSynthesis.speak(utterance);
}

/**
 * Assistant vocal multimodal : Francais lu nativement via Web Speech API (aucune dependance
 * externe, fonctionne hors-ligne des que la voix est installee sur l'appareil). Fon, Yoruba et
 * Bariba s'appuient sur des enregistrements humains pre-produits (voir jouerAudioPreEnregistre) ;
 * a defaut d'enregistrement disponible pour une phrase donnee, on retombe sur le francais plutot
 * que de rester silencieux.
 */
export function useVoiceAssistant() {
  async function lire(phrase: PhraseVocale) {
    if (languePreferee.value !== LangueAssistantVocal.FR) {
      const joue = await jouerAudioPreEnregistre(phrase.id, languePreferee.value);
      dernierRepliFrancais.value = !joue;
      if (joue) return;
    } else {
      dernierRepliFrancais.value = false;
    }
    parlerFrancais(phrase.texteFr);
  }

  function definirPhraseCourante(phrase: PhraseVocale) {
    phraseCourante.value = phrase;
  }

  return { languePreferee, definirLangue, lire, enLecture, phraseCourante, definirPhraseCourante, dernierRepliFrancais };
}
