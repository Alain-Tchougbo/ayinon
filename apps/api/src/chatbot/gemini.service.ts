import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ApiError, GoogleGenAI, type Content, type GenerateContentResponse, type Part } from "@google/genai";
import { ChatbotToolsService, DECLARATIONS_OUTILS } from "./chatbot-tools.service";

const MAX_TOURS_OUTILS = 4;
const MAX_TENTATIVES = 3;
const DELAI_BASE_MS = 500;

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nombreEnv(nom: string, valeurParDefaut: number): number {
  const valeur = Number(process.env[nom]);
  return Number.isFinite(valeur) ? valeur : valeurParDefaut;
}

export interface ReponseGemini {
  texte: string;
  appelsOutils: Array<{ nom: string; args: Record<string, unknown> }>;
}

/** Wrapper autour du SDK @google/genai : boucle de tool-calling stateless (l'historique de la
 * conversation est reconstruit a chaque appel depuis Postgres par ChatbotOrchestrationService,
 * jamais via l'API stateful "chats" du SDK — la persistance reste geree cote AYINON). */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private client: GoogleGenAI | null = null;

  constructor(private readonly outils: ChatbotToolsService) {}

  private obtenirClient(): GoogleGenAI {
    const cle = process.env.GEMINI_API_KEY;
    if (!cle) {
      throw new ServiceUnavailableException(
        "L'assistant conversationnel n'est pas configure sur cet environnement (GEMINI_API_KEY absente).",
      );
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: cle });
    }
    return this.client;
  }

  /** Le modele partage de Google renvoie de temps en temps un 503 "high demand" purement
   * transitoire (constate en conditions reelles) : quelques nouvelles tentatives avec un court
   * delai suffisent presque toujours, plutot que de faire echouer tout le tour de conversation. */
  private async genererAvecReprises(
    client: GoogleGenAI,
    modele: string,
    contenus: Content[],
    promptSysteme: string,
  ): Promise<GenerateContentResponse> {
    for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
      try {
        return await client.models.generateContent({
          model: modele,
          contents: contenus,
          config: {
            systemInstruction: promptSysteme,
            tools: [{ functionDeclarations: DECLARATIONS_OUTILS }],
            // Temperature basse par defaut : reponses factuelles et stables plutot que creatives,
            // coherent avec l'exigence de ne jamais inventer une donnee (voir chatbot.prompt.ts).
            temperature: nombreEnv("GEMINI_TEMPERATURE", 0.4),
            maxOutputTokens: nombreEnv("GEMINI_MAX_OUTPUT_TOKENS", 1024),
          },
        });
      } catch (e) {
        const reessayable = e instanceof ApiError && e.status >= 500;
        if (!reessayable || tentative === MAX_TENTATIVES) {
          throw e;
        }
        this.logger.warn(`Gemini indisponible (tentative ${tentative}/${MAX_TENTATIVES}), nouvel essai...`);
        await attendre(DELAI_BASE_MS * tentative);
      }
    }
    throw new ServiceUnavailableException("L'assistant conversationnel est momentanement indisponible.");
  }

  async repondre(promptSysteme: string, historique: Content[]): Promise<ReponseGemini> {
    const client = this.obtenirClient();
    const modele = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const contenus: Content[] = [...historique];
    const appelsOutils: ReponseGemini["appelsOutils"] = [];

    for (let tour = 0; tour < MAX_TOURS_OUTILS; tour++) {
      const reponse = await this.genererAvecReprises(client, modele, contenus, promptSysteme);

      const appels = reponse.functionCalls;
      if (!appels || appels.length === 0) {
        return {
          texte: reponse.text ?? "Je n'ai pas pu generer de reponse, pouvez-vous reformuler votre question ?",
          appelsOutils,
        };
      }

      // Rejoue le Content complet du candidat (pas une reconstruction manuelle a partir du getter
      // functionCalls) : les modeles recents attachent un thoughtSignature opaque a chaque part
      // d'appel de fonction, obligatoire au tour suivant sous peine de 400 INVALID_ARGUMENT — seul
      // le Content original le porte.
      const contenuModele: Content = reponse.candidates?.[0]?.content ?? {
        role: "model",
        parts: appels.map((appel) => ({ functionCall: appel })),
      };
      contenus.push(contenuModele);

      const partsReponses: Part[] = [];
      for (const appel of appels) {
        if (!appel.name) continue;
        const args = (appel.args ?? {}) as Record<string, unknown>;
        appelsOutils.push({ nom: appel.name, args });
        const resultat = await this.outils.executer(appel.name, args);
        partsReponses.push({ functionResponse: { name: appel.name, response: resultat } });
      }
      contenus.push({ role: "user", parts: partsReponses });
    }

    this.logger.warn(`Nombre maximal de tours d'outils atteint (${MAX_TOURS_OUTILS})`);
    return { texte: "Je n'arrive pas a finaliser ma reponse pour le moment, pouvez-vous reformuler votre question ?", appelsOutils };
  }
}
