-- CreateEnum
CREATE TYPE "TypeSignalement" AS ENUM ('ANNONCE', 'LITIGE_FONCIER');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('DEPOSE', 'FONDE', 'REJETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DEPOT_SIGNALEMENT';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'QUALIFICATION_SIGNALEMENT';

-- CreateTable
CREATE TABLE "Signalement" (
    "id" TEXT NOT NULL,
    "type" "TypeSignalement" NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "annonceId" TEXT,
    "motif" TEXT NOT NULL,
    "descriptif" TEXT,
    "statut" "StatutSignalement" NOT NULL DEFAULT 'DEPOSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signalantId" TEXT NOT NULL,
    "qualifieParId" TEXT,
    "decisionMotif" TEXT,
    "traiteLe" TIMESTAMP(3),

    CONSTRAINT "Signalement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signalement_parcelleId_idx" ON "Signalement"("parcelleId");

-- CreateIndex
CREATE INDEX "Signalement_statut_idx" ON "Signalement"("statut");

-- CreateIndex
CREATE INDEX "Signalement_type_idx" ON "Signalement"("type");

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_signalantId_fkey" FOREIGN KEY ("signalantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_qualifieParId_fkey" FOREIGN KEY ("qualifieParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
