import { Injectable } from "@nestjs/common";
import { DeposerOppositionSchema, type ActionEnAttenteDto } from "@ayinon/shared";
import { FamillesService } from "../familles/familles.service";
import { ParcellesService } from "../parcelles/parcelles.service";

export interface ResultatSyncAction {
  idLocal: string;
  statut: "ok" | "erreur";
  message?: string;
}

/**
 * Point d'entree de la synchronisation Offline-First. Le frontend met en cache local (IndexedDB)
 * les parcelles consultees et file les actions effectuees hors reseau (ex. depot d'opposition
 * pendant un ban) ; a la reconnexion, il rejoue la file ici et rafraichit son cache via pull().
 */
@Injectable()
export class SyncService {
  constructor(
    private readonly parcelles: ParcellesService,
    private readonly familles: FamillesService,
  ) {}

  async pull(depuisIso: string | undefined) {
    const horodatageServeur = new Date().toISOString();
    const donnees = depuisIso ? await this.parcelles.listerModifieesDepuis(new Date(depuisIso)) : await this.parcelles.listerToutes();
    return { parcelles: donnees, horodatageServeur };
  }

  async pousserActionsEnAttente(actions: ActionEnAttenteDto[]): Promise<ResultatSyncAction[]> {
    const resultats: ResultatSyncAction[] = [];

    for (const action of actions) {
      try {
        const dtoValide = DeposerOppositionSchema.parse(action.dto);
        await this.familles.deposerOpposition(dtoValide);
        resultats.push({ idLocal: action.idLocal, statut: "ok" });
      } catch (erreur) {
        resultats.push({
          idLocal: action.idLocal,
          statut: "erreur",
          message: erreur instanceof Error ? erreur.message : "Erreur inconnue",
        });
      }
    }

    return resultats;
  }
}
