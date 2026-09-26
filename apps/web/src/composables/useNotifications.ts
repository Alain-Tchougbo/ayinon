import { RoleUtilisateur } from "@ayinon/shared";
import { ref } from "vue";
import { api } from "../services/api";
import { useAuthStore } from "../stores/auth.store";

const compte = ref(0);
const lien = ref<string | null>(null);
const libelle = ref("");

/**
 * Pastille de notification de l'en-tete : jamais un chiffre decoratif. Chaque role pointe vers
 * un decompte reellement issu de son propre flux metier (propositions de cession recues,
 * signatures familiales en attente, cessions a valider, conflits CSAF actifs...). Pas de flux ->
 * pas de pastille, plutot que d'inventer une donnee.
 */
export function useNotifications() {
  const auth = useAuthStore();

  async function rafraichir() {
    if (!auth.estConnecte) {
      compte.value = 0;
      lien.value = null;
      return;
    }
    try {
      if (auth.role === RoleUtilisateur.VENDEUR) {
        const [mesAnnonces, visitesRecues] = await Promise.all([
          api.get<Array<{ interets: Array<{ statut: string }> }>>("/annonces/mes-annonces"),
          api.get<Array<{ statut: string }>>("/visites/recues"),
        ]);
        compte.value =
          mesAnnonces.reduce((total, a) => total + a.interets.filter((i) => i.statut === "EN_ATTENTE").length, 0) +
          visitesRecues.filter((v) => v.statut === "DEMANDEE").length;
        lien.value = "/vendre";
        libelle.value = "notification(s) a consulter";
      } else if (auth.role === RoleUtilisateur.ACHETEUR) {
        const [mesInterets, propositionsRecues, mesVisites] = await Promise.all([
          api.get<Array<{ statut: string }>>("/annonces/mes-interets"),
          api.get<unknown[]>("/cessions/mes-propositions-recues"),
          api.get<Array<{ statut: string }>>("/visites/mes-demandes"),
        ]);
        compte.value =
          mesInterets.filter((i) => i.statut === "RETENU").length +
          propositionsRecues.length +
          mesVisites.filter((v) => v.statut === "REPROGRAMMEE").length;
        lien.value = "/acheter";
        libelle.value = "notification(s) a consulter";
      } else if (auth.role === RoleUtilisateur.MANDATAIRE_FAMILIAL) {
        const signatures = await api.get<unknown[]>("/familles/mes-signatures-en-attente");
        compte.value = signatures.length;
        lien.value = "/famille";
        libelle.value = "signature(s) en attente";
      } else if (auth.role === RoleUtilisateur.AGENT_ANDF || auth.role === RoleUtilisateur.ADMIN) {
        const aValider = await api.get<unknown[]>("/cessions/a-valider");
        compte.value = aValider.length;
        lien.value = "/andf/cessions";
        libelle.value = "cession(s) a valider";
      } else if (auth.role === RoleUtilisateur.MAGISTRAT_CSAF) {
        const conflits = await api.get<unknown[]>("/csaf/conflits-actifs");
        compte.value = conflits.length;
        lien.value = "/csaf";
        libelle.value = "conflit(s) CSAF actif(s)";
      } else {
        compte.value = 0;
        lien.value = null;
      }
    } catch {
      compte.value = 0;
      lien.value = null;
    }
  }

  return { compte, lien, libelle, rafraichir };
}
