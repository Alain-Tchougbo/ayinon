import { z } from "zod";

/** Message envoye a l'assistant conversationnel (accessible anonyme ou connecte, voir chatbot.controller.ts). */
export const EnvoyerMessageChatbotSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});
export type EnvoyerMessageChatbotDto = z.infer<typeof EnvoyerMessageChatbotSchema>;
