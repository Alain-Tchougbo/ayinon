-- CreateEnum
CREATE TYPE "StatutCession" AS ENUM ('PROPOSEE', 'ACCEPTEE', 'VALIDEE', 'REJETEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'PROPOSITION_CESSION';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'ACCEPTATION_CESSION';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REJET_CESSION';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'VALIDATION_CESSION';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'DELIVRANCE_TITRE';

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "acquereurId" TEXT,
ADD COLUMN     "dateAcceptation" TIMESTAMP(3),
ADD COLUMN     "dateValidation" TIMESTAMP(3),
ADD COLUMN     "motifRejet" TEXT,
ADD COLUMN     "statutCession" "StatutCession" NOT NULL DEFAULT 'VALIDEE',
ADD COLUMN     "valideParId" TEXT;

-- AlterTable
ALTER TABLE "Titre" ADD COLUMN     "conventionId" TEXT;

-- CreateIndex
CREATE INDEX "Convention_statutCession_idx" ON "Convention"("statutCession");

-- CreateIndex
CREATE UNIQUE INDEX "Titre_conventionId_key" ON "Titre"("conventionId");

-- AddForeignKey
ALTER TABLE "Titre" ADD CONSTRAINT "Titre_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_acquereurId_fkey" FOREIGN KEY ("acquereurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

