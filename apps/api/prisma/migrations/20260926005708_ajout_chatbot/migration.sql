-- CreateEnum
CREATE TYPE "RoleMessageChatbot" AS ENUM ('UTILISATEUR', 'ASSISTANT');

-- CreateTable
CREATE TABLE "ConversationChatbot" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "sessionAnonymeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationChatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageChatbot" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "RoleMessageChatbot" NOT NULL,
    "contenu" TEXT NOT NULL,
    "appelsOutils" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageChatbot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationChatbot_utilisateurId_idx" ON "ConversationChatbot"("utilisateurId");

-- CreateIndex
CREATE INDEX "ConversationChatbot_sessionAnonymeId_idx" ON "ConversationChatbot"("sessionAnonymeId");

-- CreateIndex
CREATE INDEX "MessageChatbot_conversationId_idx" ON "MessageChatbot"("conversationId");

-- AddForeignKey
ALTER TABLE "ConversationChatbot" ADD CONSTRAINT "ConversationChatbot_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageChatbot" ADD CONSTRAINT "MessageChatbot_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ConversationChatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

