import { RoleUtilisateur } from "@ayinon/shared";

/** Libelle FR affiche pour chaque role (en-tete du tableau de bord, badge de la banniere
 * d'accueil) — source unique, partagee entre DashboardLayout.vue et AccueilView.vue. */
export const LIBELLE_ROLE: Record<RoleUtilisateur, string> = {
  CITOYEN: "Citoyen",
  VENDEUR: "Vendeur",
  ACHETEUR: "Acheteur",
  GEOMETRE: "Geometre-expert",
  NOTAIRE: "Notaire",
  MANDATAIRE_FAMILIAL: "Mandataire familial",
  AGENT_ANDF: "Agent ANDF",
  MAGISTRAT_CSAF: "Magistrat CSAF",
  AGENT_BANQUE: "Agent banque",
  ADMIN: "Administrateur",
};
