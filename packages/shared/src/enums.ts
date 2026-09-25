/**
 * Enumerations partagees entre l'API NestJS et le frontend Vue.
 * Doivent rester synchronisees avec les enums Prisma (apps/api/prisma/schema.prisma).
 */

export const RoleUtilisateur = {
  CITOYEN: "CITOYEN",
  VENDEUR: "VENDEUR",
  ACHETEUR: "ACHETEUR",
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
  PUBLICATION_ANNONCE: "PUBLICATION_ANNONCE",
  RETRAIT_ANNONCE: "RETRAIT_ANNONCE",
  MANIFESTATION_INTERET: "MANIFESTATION_INTERET",
  RETENUE_INTERET: "RETENUE_INTERET",
  VERIFICATION_ANDF_ANNONCE: "VERIFICATION_ANDF_ANNONCE",
  CREATION_COMPTE: "CREATION_COMPTE",
  DEPOT_SIGNALEMENT: "DEPOT_SIGNALEMENT",
  QUALIFICATION_SIGNALEMENT: "QUALIFICATION_SIGNALEMENT",
  DEPOT_AVIS: "DEPOT_AVIS",
  DECLARATION_SEQUESTRE: "DECLARATION_SEQUESTRE",
  CONFIRMATION_SEQUESTRE: "CONFIRMATION_SEQUESTRE",
  LIBERATION_SEQUESTRE: "LIBERATION_SEQUESTRE",
  REMBOURSEMENT_SEQUESTRE: "REMBOURSEMENT_SEQUESTRE",
  DEMANDE_VALIDATION_PRO: "DEMANDE_VALIDATION_PRO",
  VALIDATION_COMPTE_PRO: "VALIDATION_COMPTE_PRO",
  REJET_COMPTE_PRO: "REJET_COMPTE_PRO",
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

/** Cycle de vie d'une annonce (vitrine publique) : ACTIVE tant que le vendeur cherche un
 * acquereur, RETIREE si le vendeur l'annule, VENDUE des qu'une cession issue de cette annonce
 * est validee. */
export const StatutAnnonce = {
  ACTIVE: "ACTIVE",
  RETIREE: "RETIREE",
  VENDUE: "VENDUE",
} as const;
export type StatutAnnonce = (typeof StatutAnnonce)[keyof typeof StatutAnnonce];

export const StatutInteret = {
  EN_ATTENTE: "EN_ATTENTE",
  RETENU: "RETENU",
  DECLINE: "DECLINE",
} as const;
export type StatutInteret = (typeof StatutInteret)[keyof typeof StatutInteret];

/** Statut declare par un vendeur : adapte les pieces attendues lors de la publication d'une annonce. */
export const StatutDeclarantVendeur = {
  PROPRIETAIRE: "PROPRIETAIRE",
  HERITIER: "HERITIER",
  MANDATAIRE: "MANDATAIRE",
  AGENCE: "AGENCE",
} as const;
export type StatutDeclarantVendeur = (typeof StatutDeclarantVendeur)[keyof typeof StatutDeclarantVendeur];

/** File d'attente de validation des comptes professionnels (E0.5/E0.6). */
export const StatutValidationPro = {
  NON_APPLICABLE: "NON_APPLICABLE",
  EN_ATTENTE: "EN_ATTENTE",
  APPROUVE: "APPROUVE",
  REJETE: "REJETE",
} as const;
export type StatutValidationPro = (typeof StatutValidationPro)[keyof typeof StatutValidationPro];

/** Portee d'un signalement : ANNONCE (probleme sur une annonce publiee) ou LITIGE_FONCIER
 * (contestation sur la parcelle elle-meme, susceptible d'aboutir a un gel CSAF). */
export const TypeSignalement = {
  ANNONCE: "ANNONCE",
  LITIGE_FONCIER: "LITIGE_FONCIER",
} as const;
export type TypeSignalement = (typeof TypeSignalement)[keyof typeof TypeSignalement];

export const StatutSignalement = {
  DEPOSE: "DEPOSE",
  FONDE: "FONDE",
  REJETE: "REJETE",
} as const;
export type StatutSignalement = (typeof StatutSignalement)[keyof typeof StatutSignalement];

/** Sequestre en pur suivi de statut (Epic 5) : aucun mouvement d'argent reel (voir docs/decisions.md). */
export const StatutSequestre = {
  DEPOT_DECLARE: "DEPOT_DECLARE",
  DEPOT_CONFIRME: "DEPOT_CONFIRME",
  LIBERE: "LIBERE",
  REMBOURSE: "REMBOURSE",
} as const;
export type StatutSequestre = (typeof StatutSequestre)[keyof typeof StatutSequestre];
