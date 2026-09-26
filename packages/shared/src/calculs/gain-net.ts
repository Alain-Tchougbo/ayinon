/** E1.10 : taux forfaitaires indicatifs — pas un calcul fiscal reel, a affiner avec un modele
 * de commission et un bareme notarial/fiscal reellement arretes avant toute mise en production. */
export const TAUX_COMMISSION_PLATEFORME_VENTE = 0.02;
export const TAUX_FRAIS_NOTARIAUX_VENDEUR = 0.01;
export const TAUX_TAXE_PLUS_VALUE_VENTE = 0.05;

export interface SimulationGainNet {
  prixVenteFcfa: number;
  commissionPlateformeFcfa: number;
  fraisNotariauxFcfa: number;
  taxeFcfa: number;
  totalDeductionsFcfa: number;
  montantNetFcfa: number;
}

/**
 * Simulation indicative du gain net vendeur (E1.10) : commission plateforme + frais notariaux
 * vendeur (quitus, mainlevee eventuelle) + taxe sur la plus-value, a taux forfaitaires. Fonction
 * pure et deterministe pour etre appelee identiquement cote client (mise a jour instantanee au
 * fil de la saisie du prix, sans aller-retour reseau) et cote serveur si besoin, sans jamais
 * diverger entre les deux implementations.
 */
export function simulerGainNet(prixVenteFcfa: number): SimulationGainNet {
  const commissionPlateformeFcfa = Math.round(prixVenteFcfa * TAUX_COMMISSION_PLATEFORME_VENTE);
  const fraisNotariauxFcfa = Math.round(prixVenteFcfa * TAUX_FRAIS_NOTARIAUX_VENDEUR);
  const taxeFcfa = Math.round(prixVenteFcfa * TAUX_TAXE_PLUS_VALUE_VENTE);
  const totalDeductionsFcfa = commissionPlateformeFcfa + fraisNotariauxFcfa + taxeFcfa;

  return {
    prixVenteFcfa,
    commissionPlateformeFcfa,
    fraisNotariauxFcfa,
    taxeFcfa,
    totalDeductionsFcfa,
    montantNetFcfa: prixVenteFcfa - totalDeductionsFcfa,
  };
}
