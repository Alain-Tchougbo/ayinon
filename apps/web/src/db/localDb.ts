import type { ActionEnAttenteDto, GeoJsonPolygon, StatutParcelle } from "@ayinon/shared";
import Dexie, { type Table } from "dexie";

export interface ParcelleCache {
  id: string;
  nup: string;
  statut: StatutParcelle;
  poleTerritorial: string;
  commune: string;
  arrondissement: string | null;
  superficieM2: number;
  verrouAntiVente: boolean;
  geometrie: GeoJsonPolygon;
  proprietaireId: string | null;
  proprietaireNom: string | null;
}

export interface ActionEnAttenteLocale {
  idLocal: string;
  action: ActionEnAttenteDto;
  creeLe: string;
  statut: "en_attente" | "echouee";
  messageErreur?: string;
}

export interface MetaSync {
  cle: string;
  valeur: string;
}

/**
 * Base IndexedDB locale (Dexie) : socle de l'experience Offline-First. Les parcelles consultees
 * en ligne restent lisibles en brousse / zone blanche ; les actions effectuees hors-ligne
 * (ex. depot d'opposition) sont mises en file et rejouees automatiquement au retour reseau
 * (voir src/services/syncService.ts).
 */
export class AyinonDatabase extends Dexie {
  parcellesCache!: Table<ParcelleCache, string>;
  actionsEnAttente!: Table<ActionEnAttenteLocale, string>;
  metaSync!: Table<MetaSync, string>;

  constructor() {
    super("ayinon-db");
    this.version(1).stores({
      parcellesCache: "id, nup, statut, poleTerritorial, commune",
      actionsEnAttente: "idLocal, statut",
      metaSync: "cle",
    });
  }
}

export const db = new AyinonDatabase();

export async function obtenirDerniereSyncIso(): Promise<string | undefined> {
  const entree = await db.metaSync.get("derniereSyncIso");
  return entree?.valeur;
}

export async function definirDerniereSyncIso(valeur: string): Promise<void> {
  await db.metaSync.put({ cle: "derniereSyncIso", valeur });
}
