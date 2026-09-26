import { Injectable, Logger } from "@nestjs/common";
import type { FunctionDeclaration } from "@google/genai";
import { AnnoncesService } from "../annonces/annonces.service";
import { AvisService } from "../avis/avis.service";
import { ParcellesService } from "../parcelles/parcelles.service";

/**
 * Declarations exposees au modele (function-calling) : uniquement des lectures deja publiques
 * (memes donnees que la vitrine/carte cadastrale accessibles sans compte) — aucune tool ne
 * revele d'information reservee a un role regalien (voir parcelles.service.ts:obtenirHistoriquePublic,
 * deja anonymise). Le modele ne peut jamais agir au nom de l'utilisateur (voir chatbot.prompt.ts).
 */
export const DECLARATIONS_OUTILS: FunctionDeclaration[] = [
  {
    name: "rechercher_parcelle_par_nup",
    description: "Recherche une parcelle cadastrale par son NUP (Numero Unique de Parcelle), exact ou partiel.",
    parametersJsonSchema: {
      type: "object",
      properties: { nup: { type: "string", description: "Ex: BJ-LIT-COT-0009" } },
      required: ["nup"],
    },
  },
  {
    name: "obtenir_parcelle",
    description: "Recupere le detail d'une parcelle (statut cadastral, superficie, propriétaire) a partir de son identifiant interne.",
    parametersJsonSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Identifiant interne (uuid) de la parcelle" } },
      required: ["id"],
    },
  },
  {
    name: "obtenir_historique_parcelle",
    description:
      "Recupere l'historique public d'une parcelle : situation judiciaire resumee (gel CSAF en cours ou leve) et proprietaires successifs. Utilise ceci des qu'un acheteur demande si une parcelle est fiable ou a des antecedents.",
    parametersJsonSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Identifiant interne (uuid) de la parcelle" } },
      required: ["id"],
    },
  },
  {
    name: "simuler_frais_mutation",
    description: "Simule les frais de mutation (droits d'enregistrement, emoluments notariaux, taxe fonciere) pour un achat de parcelle.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        valeurDeclareeFcfa: { type: "number", description: "Prix declare de la transaction en FCFA" },
        superficieM2: { type: "number", description: "Superficie de la parcelle en m2" },
        enZoneUrbaine: { type: "boolean", description: "true si la parcelle est en zone urbaine (defaut: true)" },
      },
      required: ["valeurDeclareeFcfa", "superficieM2"],
    },
  },
  {
    name: "lister_annonces_actives",
    description: "Liste les annonces de parcelles a vendre actuellement en vitrine, avec filtres optionnels.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        commune: { type: "string" },
        prixMinFcfa: { type: "number" },
        prixMaxFcfa: { type: "number" },
        superficieMinM2: { type: "number" },
        superficieMaxM2: { type: "number" },
      },
    },
  },
  {
    name: "obtenir_annonce",
    description: "Recupere le detail d'une annonce publiee (prix, description, badges de verification) a partir de son identifiant.",
    parametersJsonSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Identifiant interne (uuid) de l'annonce" } },
      required: ["id"],
    },
  },
  {
    name: "estimer_prix_commune",
    description: "Estime le prix moyen au m2 dans une commune donnee, base sur les cessions reellement validees (jamais une valeur inventee).",
    parametersJsonSchema: {
      type: "object",
      properties: { commune: { type: "string" } },
      required: ["commune"],
    },
  },
  {
    name: "obtenir_profil_vendeur",
    description: "Recupere le profil public d'un vendeur ou acheteur (note moyenne, nombre d'avis, ventes conclues) pour evaluer sa reputation.",
    parametersJsonSchema: {
      type: "object",
      properties: { utilisateurId: { type: "string", description: "Identifiant interne (uuid) de l'utilisateur" } },
      required: ["utilisateurId"],
    },
  },
];

@Injectable()
export class ChatbotToolsService {
  private readonly logger = new Logger(ChatbotToolsService.name);

  constructor(
    private readonly parcelles: ParcellesService,
    private readonly annonces: AnnoncesService,
    private readonly avis: AvisService,
  ) {}

  /** Dispatch vers le vrai service metier. Ne laisse jamais une exception remonter au modele : une
   * tool en echec renvoie un objet {erreur} exploitable, plutot que de faire planter tout le tour
   * de conversation. */
  async executer(nom: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      switch (nom) {
        case "rechercher_parcelle_par_nup":
          return { resultats: await this.parcelles.rechercher({ nup: String(args.nup ?? "") }) };
        case "obtenir_parcelle":
          return { ...(await this.parcelles.obtenirParId(String(args.id ?? ""))) };
        case "obtenir_historique_parcelle":
          return { ...(await this.parcelles.obtenirHistoriquePublic(String(args.id ?? ""))) };
        case "simuler_frais_mutation":
          return this.parcelles.simulerFrais({
            valeurDeclareeFcfa: Number(args.valeurDeclareeFcfa),
            superficieM2: Number(args.superficieM2),
            enZoneUrbaine: args.enZoneUrbaine === undefined ? true : Boolean(args.enZoneUrbaine),
          });
        case "lister_annonces_actives":
          return { resultats: await this.annonces.listerActives(args as Record<string, string>) };
        case "obtenir_annonce":
          return await this.annonces.obtenirParId(String(args.id ?? ""));
        case "estimer_prix_commune":
          return await this.annonces.estimerPrix(String(args.commune ?? ""));
        case "obtenir_profil_vendeur":
          return await this.avis.profil(String(args.utilisateurId ?? ""));
        default:
          return { erreur: `Outil inconnu : ${nom}` };
      }
    } catch (e) {
      this.logger.warn(`Echec de l'outil "${nom}" (args: ${JSON.stringify(args)}) : ${e instanceof Error ? e.message : e}`);
      return { erreur: e instanceof Error ? e.message : "Erreur inattendue lors de l'appel de l'outil" };
    }
  }
}
