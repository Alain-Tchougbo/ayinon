-- AlterTable
ALTER TABLE "PlanBornage" ADD COLUMN     "importeParId" TEXT;

-- CreateIndex
CREATE INDEX "PlanBornage_importeParId_idx" ON "PlanBornage"("importeParId");

-- AddForeignKey
ALTER TABLE "PlanBornage" ADD CONSTRAINT "PlanBornage_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

