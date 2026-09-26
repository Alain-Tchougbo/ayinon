-- AlterEnum
ALTER TYPE "TypeOperationAudit" ADD VALUE 'ACCORD_EXCLUSIVITE';

-- AlterTable
ALTER TABLE "Annonce" ADD COLUMN     "exclusiviteAcheteurId" TEXT,
ADD COLUMN     "exclusiviteJusqua" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Annonce" ADD CONSTRAINT "Annonce_exclusiviteAcheteurId_fkey" FOREIGN KEY ("exclusiviteAcheteurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

