-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeOperationAudit" ADD VALUE 'SUSPENSION_COMPTE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'REACTIVATION_COMPTE';
ALTER TYPE "TypeOperationAudit" ADD VALUE 'MODIFICATION_ADMIN_PROPRIETAIRE';

-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "compteSuspenduLe" TIMESTAMP(3),
ADD COLUMN     "motifSuspensionCompte" TEXT,
ADD COLUMN     "suspenduParId" TEXT;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_suspenduParId_fkey" FOREIGN KEY ("suspenduParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

