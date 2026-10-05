-- CreateEnum
CREATE TYPE "TypeDocumentInstitutionnel" AS ENUM ('DECISION_ADMINISTRATIVE', 'ACTE_INSTITUTIONNEL', 'AUTRE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'INVALIDATION_CONVENTION';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'SCELLEMENT_DOCUMENT_INSTITUTIONNEL';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'INVALIDATION_DOCUMENT_INSTITUTIONNEL';

-- CreateTable
CREATE TABLE "DocumentInstitutionnel" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "TypeDocumentInstitutionnel" NOT NULL,
    "description" TEXT,
    "cheminFichier" TEXT,
    "hashSha256" TEXT NOT NULL,
    "signatureEd25519" TEXT NOT NULL,
    "qrPayload" JSONB NOT NULL,
    "valide" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emetteurId" TEXT NOT NULL,

    CONSTRAINT "DocumentInstitutionnel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentInstitutionnel_type_idx" ON "DocumentInstitutionnel"("type");

-- AddForeignKey
ALTER TABLE "DocumentInstitutionnel" ADD CONSTRAINT "DocumentInstitutionnel_emetteurId_fkey" FOREIGN KEY ("emetteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

