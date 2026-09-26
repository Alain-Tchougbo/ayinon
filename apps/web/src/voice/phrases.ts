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
  cessionIntro: {
    id: "cession-intro",
    texteFr: "Proposez la cession d'une parcelle que vous possedez, ou repondez a une proposition d'achat qui vous est adressee.",
  },
  validationCessionsIntro: {
    id: "validation-cessions-intro",
    texteFr: "Validez les cessions acceptees par l'acquereur : la validation delivre le titre foncier et transfere la propriete.",
  },
  solvabiliteIntro: {
    id: "solvabilite-intro",
    texteFr: "Verifiez si une parcelle est titree, non gelee et libre de gage avant un credit, ou inscrivez votre hypotheque.",
  },
  adminIntro: {
    id: "admin-intro",
    texteFr: "Consultez la vue d'ensemble de la plateforme et gerez les utilisateurs, proprietaires, parcelles et documents.",
  },
  adminDemandesProIntro: {
    id: "admin-demandes-pro-intro",
    texteFr: "Approuvez ou rejetez les demandes de compte professionnel en attente.",
  },
  adminUtilisateursIntro: {
    id: "admin-utilisateurs-intro",
    texteFr: "Consultez les comptes de la plateforme et suspendez un compte si necessaire.",
  },
  adminProprietairesIntro: {
    id: "admin-proprietaires-intro",
    texteFr: "Consultez les proprietaires et corrigez leurs coordonnees de contact.",
  },
  adminParcellesIntro: {
    id: "admin-parcelles-intro",
    texteFr: "Consultez les parcelles, corrigez leurs informations declaratives et consultez leur journal d'audit.",
  },
  adminDocumentsIntro: {
    id: "admin-documents-intro",
    texteFr: "Consultez le registre des conventions de vente et des titres delivres.",
  },
  adminSignalementsIntro: {
    id: "admin-signalements-intro",
    texteFr: "Qualifiez les signalements deposes comme fondes ou infondes.",
  },
  adminAnnoncesRisqueIntro: {
    id: "admin-annonces-risque-intro",
    texteFr: "Passez en revue les annonces dont le prix devie significativement de la moyenne communale.",
  },
} as const satisfies Record<string, PhraseVocale>;
