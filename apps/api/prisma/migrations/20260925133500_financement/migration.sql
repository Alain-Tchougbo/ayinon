-- CreateEnum
CREATE TYPE "StatutDemandeFinancement" AS ENUM ('EN_ATTENTE', 'ACCORD_PRINCIPE', 'REFUSEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DEMANDE_FINANCEMENT';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'CONSULTATION_FINANCEMENT';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'TRAITEMENT_FINANCEMENT';

-- CreateTable
CREATE TABLE "DemandeFinancement" (
    "id" TEXT NOT NULL,
    "montantSouhaiteFcfa" DOUBLE PRECISION NOT NULL,
    "cheminDocument" TEXT,
    "statut" "StatutDemandeFinancement" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConsultation" TIMESTAMP(3),
    "acheteurId" TEXT NOT NULL,
    "annonceId" TEXT,
    "traiteeParId" TEXT,
    "dateTraitement" TIMESTAMP(3),
    "montantAccordeFcfa" DOUBLE PRECISION,
    "motifRefus" TEXT,
    "codeVerification" TEXT,

    CONSTRAINT "DemandeFinancement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeFinancement_codeVerification_key" ON "DemandeFinancement"("codeVerification");

-- CreateIndex
CREATE INDEX "DemandeFinancement_acheteurId_idx" ON "DemandeFinancement"("acheteurId");

-- CreateIndex
CREATE INDEX "DemandeFinancement_statut_idx" ON "DemandeFinancement"("statut");

-- AddForeignKey
ALTER TABLE "DemandeFinancement" ADD CONSTRAINT "DemandeFinancement_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeFinancement" ADD CONSTRAINT "DemandeFinancement_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeFinancement" ADD CONSTRAINT "DemandeFinancement_traiteeParId_fkey" FOREIGN KEY ("traiteeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

