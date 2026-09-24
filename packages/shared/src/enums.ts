/**
 * Enumerations partagees entre l'API NestJS et le frontend Vue.
 * Doivent rester synchronisees avec les enums Prisma (apps/api/prisma/schema.prisma).
 */

export const RoleUtilisateur = {
  CITOYEN: "CITOYEN",
  GEOMETRE: "GEOMETRE",
  NOTAIRE: "NOTAIRE",
  MANDATAIRE_FAMILIAL: "MANDATAIRE_FAMILIAL",
  AGENT_ANDF: "AGENT_ANDF",
  MAGISTRAT_CSAF: "MAGISTRAT_CSAF",
  AGENT_BANQUE: "AGENT_BANQUE",
  ADMIN: "ADMIN",
} as const;
export type RoleUtilisateur = (typeof RoleUtilisateur)[keyof typeof RoleUtilisateur];

/** Statut cadastral d'une parcelle -> pilote directement le code couleur de la carte. */
export const StatutParcelle = {
  TITREE: "TITREE",
  EN_COURS: "EN_COURS",
  GEL_CSAF: "GEL_CSAF",
  DOMAINE_PUBLIC: "DOMAINE_PUBLIC",
} as const;
export type StatutParcelle = (typeof StatutParcelle)[keyof typeof StatutParcelle];

/** Vert = Titree, Jaune = En cours, Rouge = Gel CSAF, Bleu = Domaine public. */
export const COULEUR_STATUT_PARCELLE: Record<StatutParcelle, string> = {
  TITREE: "#15803d",
  EN_COURS: "#ca8a04",
  GEL_CSAF: "#dc2626",
  DOMAINE_PUBLIC: "#1d4ed8",
};

export const RoleFamilial = {
  AINE: "AINE",
  REPRESENTANT_FEMMES: "REPRESENTANT_FEMMES",
  CADET: "CADET",
  AUTRE: "AUTRE",
} as const;
export type RoleFamilial = (typeof RoleFamilial)[keyof typeof RoleFamilial];

export const StatutSignatureFamille = {
  EN_ATTENTE: "EN_ATTENTE",
  SIGNEE: "SIGNEE",
  REFUSEE: "REFUSEE",
} as const;
export type StatutSignatureFamille = (typeof StatutSignatureFamille)[keyof typeof StatutSignatureFamille];

export const DUREE_BAN_OPPOSITION_JOURS = 15;

export const StatutBan = {
  OUVERT: "OUVERT",
  CLOS_SANS_OPPOSITION: "CLOS_SANS_OPPOSITION",
  CLOS_AVEC_OPPOSITION: "CLOS_AVEC_OPPOSITION",
} as const;
export type StatutBan = (typeof StatutBan)[keyof typeof StatutBan];

export const StatutOpposition = {
  DEPOSEE: "DEPOSEE",
  EN_EXAMEN: "EN_EXAMEN",
  RESOLUE: "RESOLUE",
  REJETEE: "REJETEE",
} as const;
export type StatutOpposition = (typeof StatutOpposition)[keyof typeof StatutOpposition];

export const StatutConflitCsaf = {
  ACTIF: "ACTIF",
  LEVE: "LEVE",
} as const;
export type StatutConflitCsaf = (typeof StatutConflitCsaf)[keyof typeof StatutConflitCsaf];

export const TypeOperationAudit = {
  CREATION_PARCELLE: "CREATION_PARCELLE",
  VERROUILLAGE_ANTI_VENTE: "VERROUILLAGE_ANTI_VENTE",
  DEVERROUILLAGE_ANTI_VENTE: "DEVERROUILLAGE_ANTI_VENTE",
  IMPORT_BORNAGE: "IMPORT_BORNAGE",
  DETECTION_CHEVAUCHEMENT: "DETECTION_CHEVAUCHEMENT",
  SIGNATURE_PLAN_BORNAGE: "SIGNATURE_PLAN_BORNAGE",
  ENREGISTREMENT_CONVENTION: "ENREGISTREMENT_CONVENTION",
  DEMANDE_MULTISIGNATURE: "DEMANDE_MULTISIGNATURE",
  SIGNATURE_FAMILIALE: "SIGNATURE_FAMILIALE",
  OUVERTURE_BAN: "OUVERTURE_BAN",
  OPPOSITION_DEPOSEE: "OPPOSITION_DEPOSEE",
  CLOTURE_BAN: "CLOTURE_BAN",
  GEL_CSAF: "GEL_CSAF",
  LEVEE_GEL_CSAF: "LEVEE_GEL_CSAF",
  PROPOSITION_CESSION: "PROPOSITION_CESSION",
  ACCEPTATION_CESSION: "ACCEPTATION_CESSION",
  REJET_CESSION: "REJET_CESSION",
  VALIDATION_CESSION: "VALIDATION_CESSION",
  DELIVRANCE_TITRE: "DELIVRANCE_TITRE",
  INSCRIPTION_HYPOTHEQUE: "INSCRIPTION_HYPOTHEQUE",
  LEVEE_HYPOTHEQUE: "LEVEE_HYPOTHEQUE",
  MODIFICATION_ADMIN_PARCELLE: "MODIFICATION_ADMIN_PARCELLE",
} as const;
export type TypeOperationAudit = (typeof TypeOperationAudit)[keyof typeof TypeOperationAudit];

/** Cycle de vie d'une cession (achat/vente) : PROPOSEE par le vendeur -> ACCEPTEE par l'acquereur
 * -> VALIDEE par un agent ANDF (genere le Titre et transfere la propriete), ou REJETEE a toute etape
 * avant validation (par l'acquereur ou par l'ANDF). */
export const StatutCession = {
  PROPOSEE: "PROPOSEE",
  ACCEPTEE: "ACCEPTEE",
  VALIDEE: "VALIDEE",
  REJETEE: "REJETEE",
} as const;
export type StatutCession = (typeof StatutCession)[keyof typeof StatutCession];

export const StatutHypotheque = {
  ACTIVE: "ACTIVE",
  LEVEE: "LEVEE",
} as const;
export type StatutHypotheque = (typeof StatutHypotheque)[keyof typeof StatutHypotheque];

/**
 * Six poles territoriaux (regroupement des 12 departements du Benin), reference structurante
 * pour la console de pilotage ANDF/Mairies. Les libelles officiels du programme gouvernemental
 * devront etre alignes lors du deploiement.
 */
export const PoleTerritorial = {
  LITTORAL_ATLANTIQUE: "LITTORAL_ATLANTIQUE",
  OUEME_PLATEAU: "OUEME_PLATEAU",
  MONO_COUFFO: "MONO_COUFFO",
  ZOU_COLLINES: "ZOU_COLLINES",
  BORGOU_ALIBORI: "BORGOU_ALIBORI",
  ATACORA_DONGA: "ATACORA_DONGA",
} as const;
export type PoleTerritorial = (typeof PoleTerritorial)[keyof typeof PoleTerritorial];

export const LIBELLE_POLE_TERRITORIAL: Record<PoleTerritorial, string> = {
  LITTORAL_ATLANTIQUE: "Pole Littoral-Atlantique (Cotonou, Ouidah, Abomey-Calavi)",
  OUEME_PLATEAU: "Pole Oueme-Plateau (Porto-Novo, Pobe)",
  MONO_COUFFO: "Pole Mono-Couffo (Lokossa, Aplahoue)",
  ZOU_COLLINES: "Pole Zou-Collines (Abomey, Savalou)",
  BORGOU_ALIBORI: "Pole Borgou-Alibori (Parakou, Kandi)",
  ATACORA_DONGA: "Pole Atacora-Donga (Natitingou, Djougou)",
};

export const LangueAssistantVocal = {
  FR: "FR",
  FON: "FON",
  YORUBA: "YORUBA",
  BARIBA: "BARIBA",
} as const;
export type LangueAssistantVocal = (typeof LangueAssistantVocal)[keyof typeof LangueAssistantVocal];
