export interface PhraseVocale {
  id: string;
  texteFr: string;
}

/**
 * Catalogue des messages critiques du parcours citoyen. Chaque id correspond au nom de fichier
 * attendu dans public/audio/<langue>/<id>.mp3 pour les enregistrements natifs Fon/Yoruba/Bariba
 * (voir composables/useVoiceAssistant.ts). Tant que l'enregistrement n'existe pas, l'assistant
 * se replie automatiquement sur la synthese vocale francaise du texteFr.
 */
export const PHRASES = {
  bienvenue: {
    id: "bienvenue",
    texteFr: "Bienvenue sur AYINON, le gardien numerique de la terre.",
  },
  rechercheParcelle: {
    id: "recherche-parcelle",
    texteFr: "Entrez le numero de votre parcelle, ou votre nom, pour verifier votre terre.",
  },
  parcelleTitree: {
    id: "parcelle-titree",
    texteFr: "Cette parcelle est titree et securisee. Elle est affichee en vert.",
  },
  parcelleEnCours: {
    id: "parcelle-en-cours",
    texteFr: "Cette parcelle est en cours de securisation. Elle est affichee en jaune.",
  },
  parcelleGelCsaf: {
    id: "parcelle-gel-csaf",
    texteFr: "Attention. Cette parcelle est geleé par la justice. Elle est affichee en rouge. Aucune vente n'est possible.",
  },
  parcelleDomainePublic: {
    id: "parcelle-domaine-public",
    texteFr: "Cette parcelle appartient au domaine public. Elle est affichee en bleu.",
  },
  scannerIntro: {
    id: "scanner-intro",
    texteFr: "Placez le code QR de votre convention devant la camera pour verifier son authenticite.",
  },
  scannerOk: {
    id: "scanner-ok",
    texteFr: "Ce document est authentique et enregistre dans le registre national.",
  },
  scannerKo: {
    id: "scanner-ko",
    texteFr: "Attention. Ce document est falsifie ou introuvable dans le registre.",
  },
  verrouActive: {
    id: "verrou-active",
    texteFr: "Votre parcelle est maintenant verrouillee. Aucune vente ne peut se faire sans votre accord.",
  },
} as const satisfies Record<string, PhraseVocale>;
