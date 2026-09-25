import type { InscriptionDto, RoleUtilisateur } from "@ayinon/shared";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, api } from "../services/api";

export interface UtilisateurConnecte {
  id: string;
  email: string;
  role: RoleUtilisateur;
  nomComplet: string;
  proprietaireId: string | null;
}

export const useAuthStore = defineStore("auth", () => {
  const utilisateur = ref<UtilisateurConnecte | null>(null);
  const chargementInitial = ref(true);
  const erreur = ref<string | null>(null);

  const estConnecte = computed(() => utilisateur.value !== null);
  const role = computed(() => utilisateur.value?.role ?? null);

  async function chargerSession() {
    try {
      utilisateur.value = await api.get<UtilisateurConnecte>("/auth/moi");
    } catch {
      utilisateur.value = null;
    } finally {
      chargementInitial.value = false;
    }
  }

  async function connexion(email: string, motDePasse: string) {
    erreur.value = null;
    try {
      utilisateur.value = await api.post<UtilisateurConnecte>("/auth/connexion", { email, motDePasse });
      return true;
    } catch (e) {
      erreur.value = e instanceof ApiError ? e.message : "Connexion impossible";
      return false;
    }
  }

  /** E0.1 : inscription en libre-service. Ne connecte pas encore — un code de confirmation doit
   * d'abord etre valide (voir confirmerInscription). */
  async function inscription(dto: InscriptionDto) {
    erreur.value = null;
    try {
      return await api.post<{ message: string; codeDebug?: string }>("/auth/inscription", dto);
    } catch (e) {
      erreur.value = e instanceof ApiError ? e.message : "Inscription impossible";
      return null;
    }
  }

  async function confirmerInscription(email: string, code: string) {
    erreur.value = null;
    try {
      utilisateur.value = await api.post<UtilisateurConnecte>("/auth/inscription/confirmer", { email, code });
      return true;
    } catch (e) {
      erreur.value = e instanceof ApiError ? e.message : "Code de confirmation invalide";
      return false;
    }
  }

  async function deconnexion() {
    try {
      await api.post("/auth/deconnexion");
    } finally {
      utilisateur.value = null;
    }
  }

  return {
    utilisateur,
    chargementInitial,
    erreur,
    estConnecte,
    role,
    chargerSession,
    connexion,
    inscription,
    confirmerInscription,
    deconnexion,
  };
});
