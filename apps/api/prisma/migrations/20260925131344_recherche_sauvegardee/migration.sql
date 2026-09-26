-- CreateTable
CREATE TABLE "RechercheSauvegardee" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "commune" TEXT,
    "prixMinFcfa" DOUBLE PRECISION,
    "prixMaxFcfa" DOUBLE PRECISION,
    "superficieMinM2" DOUBLE PRECISION,
    "superficieMaxM2" DOUBLE PRECISION,
    "verifieeAndf" BOOLEAN,
    "limitesCertifiees" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "derniereConsultation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acheteurId" TEXT NOT NULL,

    CONSTRAINT "RechercheSauvegardee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RechercheSauvegardee_acheteurId_idx" ON "RechercheSauvegardee"("acheteurId");

-- AddForeignKey
ALTER TABLE "RechercheSauvegardee" ADD CONSTRAINT "RechercheSauvegardee_acheteurId_fkey" FOREIGN KEY ("acheteurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

