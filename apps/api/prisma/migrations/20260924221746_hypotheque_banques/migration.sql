-- CreateEnum
CREATE TYPE "StatutHypotheque" AS ENUM ('ACTIVE', 'LEVEE');

-- AlterEnum
ALTER TYPE "RoleUtilisateur" ADD VALUE 'AGENT_BANQUE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'INSCRIPTION_HYPOTHEQUE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'LEVEE_HYPOTHEQUE';

-- CreateTable
CREATE TABLE "Hypotheque" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "banqueNom" TEXT NOT NULL,
    "montantGarantiFcfa" DOUBLE PRECISION NOT NULL,
    "statut" "StatutHypotheque" NOT NULL DEFAULT 'ACTIVE',
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLevee" TIMESTAMP(3),
    "motifLevee" TEXT,
    "inscriteParId" TEXT NOT NULL,
    "leveeParId" TEXT,

    CONSTRAINT "Hypotheque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hypotheque_parcelleId_idx" ON "Hypotheque"("parcelleId");

-- CreateIndex
CREATE INDEX "Hypotheque_statut_idx" ON "Hypotheque"("statut");

-- AddForeignKey
ALTER TABLE "Hypotheque" ADD CONSTRAINT "Hypotheque_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypotheque" ADD CONSTRAINT "Hypotheque_inscriteParId_fkey" FOREIGN KEY ("inscriteParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypotheque" ADD CONSTRAINT "Hypotheque_leveeParId_fkey" FOREIGN KEY ("leveeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

