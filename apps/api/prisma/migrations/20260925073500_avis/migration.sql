-- AlterEnum
ALTER TYPE "TypeOperationAudit" ADD VALUE 'DEPOT_AVIS';

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "conventionId" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" TEXT NOT NULL,
    "citeId" TEXT NOT NULL,

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Avis_citeId_idx" ON "Avis"("citeId");

-- CreateIndex
CREATE UNIQUE INDEX "Avis_conventionId_auteurId_key" ON "Avis"("conventionId", "auteurId");

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_conventionId_fkey" FOREIGN KEY ("conventionId") REFERENCES "Convention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_citeId_fkey" FOREIGN KEY ("citeId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

