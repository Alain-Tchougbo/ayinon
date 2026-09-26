-- CreateEnum
CREATE TYPE "ModeVisite" AS ENUM ('PRESENTIEL', 'VIDEO');

-- CreateEnum
CREATE TYPE "StatutVisite" AS ENUM ('DEMANDEE', 'CONFIRMEE', 'REFUSEE', 'REPROGRAMMEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DEMANDE_VISITE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REPONSE_VISITE';

-- CreateTable
CREATE TABLE "Visite" (
    "id" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "mode" "ModeVisite" NOT NULL,
    "dateProposee" TIMESTAMP(3) NOT NULL,
    "messageAcheteur" TEXT,
    "statut" "StatutVisite" NOT NULL DEFAULT 'DEMANDEE',
    "nouvelleDateProposee" TIMESTAMP(3),
    "motifRefus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeLe" TIMESTAMP(3),
    "acheteurId" TEXT NOT NULL,

    CONSTRAINT "Visite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visite_annonceId_idx" ON "Visite"("annonceId");

-- CreateIndex
CREATE INDEX "Visite_acheteurId_idx" ON "Visite"("acheteurId");

-- AddForeignKey
ALTER TABLE "Visite" ADD CONSTRAINT "Visite_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visite" ADD CONSTRAINT "Visite_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

