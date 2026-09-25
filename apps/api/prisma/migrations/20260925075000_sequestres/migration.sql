-- CreateEnum
CREATE TYPE "StatutSequestre" AS ENUM ('DEPOT_DECLARE', 'DEPOT_CONFIRME', 'LIBERE', 'REMBOURSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DECLARATION_SEQUESTRE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'CONFIRMATION_SEQUESTRE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'LIBERATION_SEQUESTRE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REMBOURSEMENT_SEQUESTRE';

-- CreateTable
CREATE TABLE "Sequestre" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "montantFcfa" DOUBLE PRECISION NOT NULL,
    "statut" "StatutSequestre" NOT NULL DEFAULT 'DEPOT_DECLARE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declareParId" TEXT NOT NULL,
    "dateDeclaration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmeParId" TEXT,
    "dateConfirmation" TIMESTAMP(3),
    "dateLiberation" TIMESTAMP(3),
    "dateRemboursement" TIMESTAMP(3),
    "motifRemboursement" TEXT,

    CONSTRAINT "Sequestre_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequestre_conventionId_key" ON "Sequestre"("conventionId");

-- AddForeignKey
ALTER TABLE "Sequestre" ADD CONSTRAINT "Sequestre_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequestre" ADD CONSTRAINT "Sequestre_declareParId_fkey" FOREIGN KEY ("declareParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequestre" ADD CONSTRAINT "Sequestre_confirmeParId_fkey" FOREIGN KEY ("confirmeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

