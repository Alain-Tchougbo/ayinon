import type { ActionEnAttenteDto } from "@ayinon/shared";
import { db, definirDerniereSyncIso, obtenirDerniereSyncIso, type ParcelleCache } from "../db/localDb";
import { api } from "./api";

interface ReponsePull {
  parcelles: ParcelleCache[];
  horodatageServeur: string;
}

interface ResultatSyncAction {
  idLocal: string;
  statut: "ok" | "erreur";
  message?: string;
}

/**
 * Rafraichit le cache local (IndexedDB) avec les parcelles modifiees depuis la derniere
 * synchronisation. Utilisable hors-ligne : en l'absence de reseau, fetch() echoue et l'appelant
 * continue de lire le cache existant (voir stores/parcelles.store.ts).
 */
export async function rafraichirCacheParcelles(): Promise<void> {
  const depuis = await obtenirDerniereSyncIso();
  const chemin = depuis ? `/sync/pull?depuis=${encodeURIComponent(depuis)}` : "/sync/pull";
  const reponse = await api.get<ReponsePull>(chemin);

  if (reponse.parcelles.length > 0) {
    await db.parcellesCache.bulkPut(reponse.parcelles);
  }
  await definirDerniereSyncIso(reponse.horodatageServeur);
}

/** Met en file une action realisee hors-ligne (ex. depot d'opposition par un voisin sans reseau). */
export async function mettreEnFileAction(action: ActionEnAttenteDto): Promise<void> {
  await db.actionsEnAttente.put({
    idLocal: action.idLocal,
    action,
    creeLe: new Date().toISOString(),
    statut: "en_attente",
  });
}

export async function nombreActionsEnAttente(): Promise<number> {
  return db.actionsEnAttente.where("statut").equals("en_attente").count();
}

/** Rejoue la file d'actions en attente aupres du serveur des que le reseau revient. */
export async function synchroniserActionsEnAttente(): Promise<{ synchronisees: number; echouees: number }> {
  const enAttente = await db.actionsEnAttente.where("statut").equals("en_attente").toArray();
  if (enAttente.length === 0) {
    return { synchronisees: 0, echouees: 0 };
  }

  const resultats = await api.post<ResultatSyncAction[]>(
    "/sync/push",
    { actions: enAttente.map((a) => a.action) },
  );

  let synchronisees = 0;
  let echouees = 0;
  for (const resultat of resultats) {
    if (resultat.statut === "ok") {
      await db.actionsEnAttente.delete(resultat.idLocal);
      synchronisees += 1;
    } else {
      await db.actionsEnAttente.update(resultat.idLocal, { statut: "echouee", messageErreur: resultat.message });
      echouees += 1;
    }
  }
  return { synchronisees, echouees };
}

/** A appeler une fois au demarrage de l'app : synchronise immediatement puis a chaque retour reseau. */
export function initialiserSynchronisationAutomatique(): void {
  const tenterSync = () => {
    synchroniserActionsEnAttente().catch(() => undefined);
    rafraichirCacheParcelles().catch(() => undefined);
  };

  window.addEventListener("online", tenterSync);
  if (navigator.onLine) {
    tenterSync();
  }
}
