-- CreateEnum
CREATE TYPE "StatutValidationPro" AS ENUM ('NON_APPLICABLE', 'EN_ATTENTE', 'APPROUVE', 'REJETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DEMANDE_VALIDATION_PRO';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'VALIDATION_COMPTE_PRO';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REJET_COMPTE_PRO';

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "motifRejetPro" TEXT,
ADD COLUMN     "numeroAgrement" TEXT,
ADD COLUMN     "statutValidationPro" "StatutValidationPro" NOT NULL DEFAULT 'NON_APPLICABLE',
ADD COLUMN     "valideParId" TEXT;

-- CreateIndex
CREATE INDEX "Utilisateur_statutValidationPro_idx" ON "Utilisateur"("statutValidationPro");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

