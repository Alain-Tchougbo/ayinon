import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Content } from "@google/genai";
import { RoleMessageChatbot, type EnvoyerMessageChatbotDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { construirePromptSysteme } from "./chatbot.prompt";
import { GeminiService } from "./gemini.service";

export interface ReponseChatbot {
  conversationId: string;
  reponse: string;
}

/**
 * Orchestre un tour de conversation : resout/cree la conversation (avec verification de
 * propriete pour ne jamais laisser un utilisateur lire/continuer la conversation d'un autre),
 * persiste chaque message, puis delegue la generation a GeminiService. L'historique envoye au
 * modele est reconstruit a chaque appel depuis Postgres (voir GeminiService), jamais garde en
 * memoire process — coherent avec le choix de persistance en base (tracabilite).
 */
@Injectable()
export class ChatbotOrchestrationService {
  private readonly logger = new Logger(ChatbotOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async envoyerMessage(
    dto: EnvoyerMessageChatbotDto,
    utilisateur: UtilisateurAuthentifie | undefined,
    sessionAnonymeId: string | undefined,
  ): Promise<ReponseChatbot> {
    try {
      return await this.traiter(dto, utilisateur, sessionAnonymeId);
    } catch (e) {
      this.logger.error(e instanceof Error ? e.stack ?? e.message : e);
      throw e;
    }
  }

  private async traiter(
    dto: EnvoyerMessageChatbotDto,
    utilisateur: UtilisateurAuthentifie | undefined,
    sessionAnonymeId: string | undefined,
  ): Promise<ReponseChatbot> {
    const conversation = await this.resoudreConversation(dto.conversationId, utilisateur, sessionAnonymeId);

    await this.prisma.messageChatbot.create({
      data: { conversationId: conversation.id, role: RoleMessageChatbot.UTILISATEUR, contenu: dto.message },
    });

    const messagesPrecedents = await this.prisma.messageChatbot.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });
    const historique: Content[] = messagesPrecedents.map((m) => ({
      role: m.role === RoleMessageChatbot.ASSISTANT ? "model" : "user",
      parts: [{ text: m.contenu }],
    }));

    const promptSysteme = construirePromptSysteme(utilisateur?.role ?? null);
    const { texte, appelsOutils } = await this.gemini.repondre(promptSysteme, historique);

    await this.prisma.messageChatbot.create({
      data: {
        conversationId: conversation.id,
        role: RoleMessageChatbot.ASSISTANT,
        contenu: texte,
        appelsOutils: appelsOutils.length > 0 ? (appelsOutils as unknown as Prisma.InputJsonValue) : undefined,
      },
    });

    return { conversationId: conversation.id, reponse: texte };
  }

  private async resoudreConversation(
    conversationId: string | undefined,
    utilisateur: UtilisateurAuthentifie | undefined,
    sessionAnonymeId: string | undefined,
  ) {
    if (!conversationId) {
      return this.prisma.conversationChatbot.create({
        data: {
          utilisateurId: utilisateur?.id,
          sessionAnonymeId: utilisateur ? undefined : sessionAnonymeId,
        },
      });
    }

    const conversation = await this.prisma.conversationChatbot.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException("Conversation introuvable");
    }

    const proprietaire = utilisateur
      ? conversation.utilisateurId === utilisateur.id
      : conversation.utilisateurId === null &&
        conversation.sessionAnonymeId !== null &&
        conversation.sessionAnonymeId === sessionAnonymeId;

    if (!proprietaire) {
      throw new ForbiddenException("Cette conversation ne vous appartient pas");
    }
    return conversation;
  }
}
