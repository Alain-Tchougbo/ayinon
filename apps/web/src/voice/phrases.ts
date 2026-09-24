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
  carteIntro: {
    id: "carte-intro",
    texteFr: "Voici la carte de toutes les parcelles. Touchez une parcelle coloree pour connaitre son statut.",
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
  connexionIntro: {
    id: "connexion-intro",
    texteFr: "Connectez-vous avec votre adresse e-mail et votre mot de passe pour acceder a votre espace.",
  },
  simulateurIntro: {
    id: "simulateur-intro",
    texteFr: "Calculez a l'avance les frais reels d'une transaction fonciere, pour eviter les rackets des demarcheurs.",
  },
  passeportIntro: {
    id: "passeport-intro",
    texteFr: "Consultez vos parcelles et verrouillez-les pour empecher toute vente faite sans votre accord.",
  },
  familleIntro: {
    id: "famille-intro",
    texteFr: "Consultez et signez les demandes de vente d'une terre familiale qui vous sont soumises.",
  },
  geometreIntro: {
    id: "geometre-intro",
    texteFr: "Importez un plan de bornage pour verifier automatiquement les chevauchements avec les parcelles voisines.",
  },
  csafIntro: {
    id: "csaf-intro",
    texteFr: "Placez une parcelle contestee sous gel conservatoire judiciaire, ou levez un gel existant.",
  },
  consolePolesIntro: {
    id: "console-poles-intro",
    texteFr: "Consultez la repartition et l'integrite du foncier par pole territorial.",
  },
} as const satisfies Record<string, PhraseVocale>;
