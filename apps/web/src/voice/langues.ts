import { LangueAssistantVocal } from "@ayinon/shared";

/**
 * audioDisponible : passe a true le jour ou de vrais enregistrements humains existent sous
 * public/audio/<langue>/ (voir useVoiceAssistant.jouerAudioPreEnregistre). Tant que ce n'est pas
 * le cas, le selecteur et l'assistant doivent le dire explicitement plutot que de basculer en
 * francais sans prevenir.
 */
export const LANGUES: Array<{ valeur: LangueAssistantVocal; label: string; audioDisponible: boolean }> = [
  { valeur: LangueAssistantVocal.FR, label: "Francais", audioDisponible: true },
  { valeur: LangueAssistantVocal.FON, label: "Fɔngbe", audioDisponible: false },
  { valeur: LangueAssistantVocal.YORUBA, label: "Yorùbá", audioDisponible: false },
  { valeur: LangueAssistantVocal.BARIBA, label: "Bariba", audioDisponible: false },
];
