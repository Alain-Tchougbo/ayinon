import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { EnvoyerMessageChatbotSchema, type EnvoyerMessageChatbotDto } from "@ayinon/shared";
import { CurrentUser, type UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { OptionalJwtAuthGuard } from "../common/guards/optional-jwt-auth.guard";
import { Public } from "../common/decorators/public.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ChatbotOrchestrationService } from "./chatbot-orchestration.service";

@Controller("chatbot")
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotOrchestrationService) {}

  // @Public() fait passer le JwtAuthGuard global sans invoquer Passport ; OptionalJwtAuthGuard,
  // pose en local, tente ensuite de peupler CurrentUser() si un cookie de session est present,
  // sans jamais rejeter l'anonyme (voir optional-jwt-auth.guard.ts).
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("messages")
  async envoyerMessage(
    @Body(new ZodValidationPipe(EnvoyerMessageChatbotSchema)) dto: EnvoyerMessageChatbotDto,
    @CurrentUser() utilisateur: UtilisateurAuthentifie | undefined,
    @Headers("x-chat-session-id") sessionAnonymeId?: string,
  ) {
    return this.chatbot.envoyerMessage(dto, utilisateur, sessionAnonymeId);
  }
}
