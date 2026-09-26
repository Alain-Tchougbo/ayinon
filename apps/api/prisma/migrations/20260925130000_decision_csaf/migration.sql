-- CreateEnum
CREATE TYPE "TypeDecisionCsaf" AS ENUM ('LEVEE_SIMPLE', 'ANNULATION_VENTE', 'TRANSFERT_FORCE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'DECISION_CSAF_ANNULATION_VENTE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'DECISION_CSAF_TRANSFERT_FORCE';

-- AlterTable
ALTER TABLE "ConflitCsaf" ADD COLUMN     "cheminDecision" TEXT,
ADD COLUMN     "typeDecision" "TypeDecisionCsaf";

