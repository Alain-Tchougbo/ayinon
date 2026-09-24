import type { RechercheParcelleDto } from "@ayinon/shared";
import { defineStore } from "pinia";
import { ref } from "vue";
import { db, type ParcelleCache } from "../db/localDb";
import { api } from "../services/api";

/**
 * Source unique de verite pour la carte cadastrale : tente le reseau, se replie silencieusement
 * sur le cache IndexedDB en cas d'echec (zone blanche). Toute lecture reussie en ligne rafraichit
 * le cache pour la prochaine session hors-ligne.
 */
export const useParcellesStore = defineStore("parcelles", () => {
  const parcelles = ref<ParcelleCache[]>([]);
  const horsLigne = ref(false);
  const chargement = ref(false);

  async function chargerToutes() {
    chargement.value = true;
    try {
      const donnees = await api.get<ParcelleCache[]>("/parcelles");
      parcelles.value = donnees;
      horsLigne.value = false;
      await db.parcellesCache.bulkPut(donnees);
    } catch {
      parcelles.value = await db.parcellesCache.toArray();
      horsLigne.value = true;
    } finally {
      chargement.value = false;
    }
  }

  async function rechercher(dto: RechercheParcelleDto): Promise<ParcelleCache[]> {
    try {
      const resultats = await api.post<ParcelleCache[]>("/parcelles/recherche", dto);
      horsLigne.value = false;
      return resultats;
    } catch {
      horsLigne.value = true;
      const cache = await db.parcellesCache.toArray();
      return cache.filter((p) => {
        if (dto.nup) return p.nup.toLowerCase().includes(dto.nup.toLowerCase());
        if (dto.nomProprietaire) return (p.proprietaireNom ?? "").toLowerCase().includes(dto.nomProprietaire.toLowerCase());
        return false;
      });
    }
  }

  return { parcelles, horsLigne, chargement, chargerToutes, rechercher };
});
