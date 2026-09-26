import { Module } from "@nestjs/common";
import { AnnoncesModule } from "../annonces/annonces.module";
import { AvisModule } from "../avis/avis.module";
import { ParcellesModule } from "../parcelles/parcelles.module";
import { ChatbotOrchestrationService } from "./chatbot-orchestration.service";
import { ChatbotToolsService } from "./chatbot-tools.service";
import { ChatbotController } from "./chatbot.controller";
import { GeminiService } from "./gemini.service";

@Module({
  imports: [ParcellesModule, AnnoncesModule, AvisModule],
  controllers: [ChatbotController],
  providers: [ChatbotOrchestrationService, GeminiService, ChatbotToolsService],
})
export class ChatbotModule {}
