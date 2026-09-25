-- CreateEnum
CREATE TYPE "StatutAnnonce" AS ENUM ('ACTIVE', 'RETIREE', 'VENDUE');

-- CreateEnum
CREATE TYPE "StatutInteret" AS ENUM ('EN_ATTENTE', 'RETENU', 'DECLINE');

-- CreateEnum
CREATE TYPE "StatutDeclarantVendeur" AS ENUM ('PROPRIETAIRE', 'HERITIER', 'MANDATAIRE', 'AGENCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleUtilisateur" ADD VALUE 'VENDEUR';
ALTER TYPE "RoleUtilisateur" ADD VALUE 'ACHETEUR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'PUBLICATION_ANNONCE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'RETRAIT_ANNONCE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'MANIFESTATION_INTERET';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'RETENUE_INTERET';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'VERIFICATION_ANDF_ANNONCE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'CREATION_COMPTE';

-- AlterTable
ALTER TABLE "Convention" ADD COLUMN     "annonceId" TEXT;

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "emailValide" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "statutDeclarant" "StatutDeclarantVendeur";

-- CreateTable
CREATE TABLE "Annonce" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "prixIndicatifFcfa" DOUBLE PRECISION,
    "description" TEXT,
    "statut" "StatutAnnonce" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retireeLe" TIMESTAMP(3),
    "publieeParId" TEXT NOT NULL,
    "verifieeParAndfId" TEXT,
    "dateVerificationAndf" TIMESTAMP(3),

    CONSTRAINT "Annonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteretAchat" (
    "id" TEXT NOT NULL,
    "annonceId" TEXT NOT NULL,
    "message" TEXT,
    "statut" "StatutInteret" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acheteurId" TEXT NOT NULL,

    CONSTRAINT "InteretAchat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annonce_parcelleId_idx" ON "Annonce"("parcelleId");

-- CreateIndex
CREATE INDEX "Annonce_statut_idx" ON "Annonce"("statut");

-- CreateIndex
CREATE INDEX "InteretAchat_annonceId_idx" ON "InteretAchat"("annonceId");

-- CreateIndex
CREATE UNIQUE INDEX "InteretAchat_annonceId_acheteurId_key" ON "InteretAchat"("annonceId", "acheteurId");

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_publieeParId_fkey" FOREIGN KEY ("publieeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_verifieeParAndfId_fkey" FOREIGN KEY ("verifieeParAndfId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteretAchat" ADD CONSTRAINT "InteretAchat_annonceId_fkey" FOREIGN KEY ("annonceId") REFERENCES "Annonce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteretAchat" ADD CONSTRAINT "InteretAchat_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

