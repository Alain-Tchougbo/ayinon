-- CreateEnum
CREATE TYPE "SourceBati" AS ENUM ('IMPORT_IA', 'SAISIE_MANUELLE');

-- CreateEnum
CREATE TYPE "TypeUsageSol" AS ENUM ('AGRICOLE', 'URBAIN', 'FORET', 'EAU', 'AUTRE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'IMPORT_BATI';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'VALIDATION_BATI';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REJET_BATI';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'VALIDATION_USAGE_SOL';

-- AlterTable
ALTER TABLE "Parcelle" ADD COLUMN     "usageSolIndicatif" "TypeUsageSol",
ADD COLUMN     "usageSolValide" "TypeUsageSol",
ADD COLUMN     "usageSolValideParId" TEXT;

-- CreateTable
CREATE TABLE "Bati" (
    "id" TEXT NOT NULL,
    "geom" geometry(Polygon, 4326) NOT NULL,
    "source" "SourceBati" NOT NULL,
    "scoreConfiance" DOUBLE PRECISION,
    "parcelleId" TEXT,
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bati_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneOccupationSol" (
    "id" TEXT NOT NULL,
    "geom" geometry(Polygon, 4326) NOT NULL,
    "typeUsage" "TypeUsageSol" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ESA_WORLDCOVER_2021',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneOccupationSol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bati_parcelleId_idx" ON "Bati"("parcelleId");

-- CreateIndex
CREATE INDEX "Bati_valide_idx" ON "Bati"("valide");

-- CreateIndex
CREATE INDEX "ZoneOccupationSol_typeUsage_idx" ON "ZoneOccupationSol"("typeUsage");

-- AddForeignKey
ALTER TABLE "Parcelle" ADD CONSTRAINT "Parcelle_usageSolValideParId_fkey" FOREIGN KEY ("usageSolValideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bati" ADD CONSTRAINT "Bati_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bati" ADD CONSTRAINT "Bati_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

