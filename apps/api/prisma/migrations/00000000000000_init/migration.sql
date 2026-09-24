-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('CITOYEN', 'GEOMETRE', 'NOTAIRE', 'MANDATAIRE_FAMILIAL', 'AGENT_ANDF', 'MAGISTRAT_CSAF', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatutParcelle" AS ENUM ('TITREE', 'EN_COURS', 'GEL_CSAF', 'DOMAINE_PUBLIC');

-- CreateEnum
CREATE TYPE "RoleFamilial" AS ENUM ('AINE', 'REPRESENTANT_FEMMES', 'CADET', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutSignatureFamille" AS ENUM ('EN_ATTENTE', 'SIGNEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutBan" AS ENUM ('OUVERT', 'CLOS_SANS_OPPOSITION', 'CLOS_AVEC_OPPOSITION');

-- CreateEnum
CREATE TYPE "StatutOpposition" AS ENUM ('DEPOSEE', 'EN_EXAMEN', 'RESOLUE', 'REJETEE');

-- CreateEnum
CREATE TYPE "StatutConflitCsaf" AS ENUM ('ACTIF', 'LEVE');

-- CreateEnum
CREATE TYPE "TypeOperationAudit" AS ENUM ('CREATION_PARCELLE', 'VERROUILLAGE_ANTI_VENTE', 'DEVERROUILLAGE_ANTI_VENTE', 'IMPORT_BORNAGE', 'DETECTION_CHEVAUCHEMENT', 'SIGNATURE_PLAN_BORNAGE', 'ENREGISTREMENT_CONVENTION', 'DEMANDE_MULTISIGNATURE', 'SIGNATURE_FAMILIALE', 'OUVERTURE_BAN', 'OPPOSITION_DEPOSEE', 'CLOTURE_BAN', 'GEL_CSAF', 'LEVEE_GEL_CSAF');

-- CreateEnum
CREATE TYPE "PoleTerritorial" AS ENUM ('LITTORAL_ATLANTIQUE', 'OUEME_PLATEAU', 'MONO_COUFFO', 'ZOU_COLLINES', 'BORGOU_ALIBORI', 'ATACORA_DONGA');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "telephone" TEXT,
    "poleTerritorial" "PoleTerritorial",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proprietaireId" TEXT,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeOtp" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contexte" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proprietaire" (
    "id" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "numeroPieceIdentite" TEXT,
    "estDiaspora" BOOLEAN NOT NULL DEFAULT false,
    "paysResidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proprietaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcelle" (
    "id" TEXT NOT NULL,
    "nup" TEXT NOT NULL,
    "geom" geometry(Polygon, 4326) NOT NULL,
    "superficieM2" DOUBLE PRECISION NOT NULL,
    "statut" "StatutParcelle" NOT NULL DEFAULT 'EN_COURS',
    "poleTerritorial" "PoleTerritorial" NOT NULL,
    "commune" TEXT NOT NULL,
    "arrondissement" TEXT,
    "verrouAntiVente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "proprietaireId" TEXT,

    CONSTRAINT "Parcelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Titre" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "numeroTitre" TEXT NOT NULL,
    "dateDelivrance" TIMESTAMP(3) NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "signatureEd25519" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Titre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "vendeurNom" TEXT NOT NULL,
    "acquereurNom" TEXT NOT NULL,
    "montantFcfa" DOUBLE PRECISION NOT NULL,
    "cheminFichier" TEXT,
    "hashSha256" TEXT NOT NULL,
    "signatureEd25519" TEXT NOT NULL,
    "qrPayload" JSONB NOT NULL,
    "valide" BOOLEAN NOT NULL DEFAULT true,
    "creeParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanBornage" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "geometrie" geometry(Polygon, 4326) NOT NULL,
    "referenceDossier" TEXT NOT NULL,
    "chevauchementDetecte" BOOLEAN NOT NULL DEFAULT false,
    "parcellesEnConflit" TEXT[],
    "numeroOrdreOgeb" TEXT,
    "hashSha256" TEXT NOT NULL,
    "signatureEd25519" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signeParId" TEXT,

    CONSTRAINT "PlanBornage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandataireFamille" (
    "id" TEXT NOT NULL,
    "proprietaireId" TEXT NOT NULL,
    "role" "RoleFamilial" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MandataireFamille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureFamille" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "mandataireId" TEXT NOT NULL,
    "role" "RoleFamilial" NOT NULL,
    "statut" "StatutSignatureFamille" NOT NULL DEFAULT 'EN_ATTENTE',
    "signeLe" TIMESTAMP(3),
    "hashSha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureFamille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BanOpposition" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutBan" NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BanOpposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opposition" (
    "id" TEXT NOT NULL,
    "banId" TEXT NOT NULL,
    "opposantNom" TEXT NOT NULL,
    "opposantContact" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "StatutOpposition" NOT NULL DEFAULT 'DEPOSEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflitCsaf" (
    "id" TEXT NOT NULL,
    "parcelleId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "referenceDossierJudiciaire" TEXT NOT NULL,
    "statut" "StatutConflitCsaf" NOT NULL DEFAULT 'ACTIF',
    "statutParcelleAvantGel" "StatutParcelle" NOT NULL,
    "dateGel" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLevee" TIMESTAMP(3),
    "motifLevee" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ouvertParId" TEXT NOT NULL,

    CONSTRAINT "ConflitCsaf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutationAudit" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "parcelleId" TEXT,
    "typeOperation" "TypeOperationAudit" NOT NULL,
    "acteurId" TEXT,
    "roleActeur" "RoleUtilisateur",
    "payload" JSONB NOT NULL,
    "hashPayload" TEXT NOT NULL,
    "hashBlocPrecedent" TEXT NOT NULL,
    "hashBloc" TEXT NOT NULL,
    "signatureEd25519" TEXT NOT NULL,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_proprietaireId_key" ON "Utilisateur"("proprietaireId");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE INDEX "RefreshToken_utilisateurId_idx" ON "RefreshToken"("utilisateurId");

-- CreateIndex
CREATE INDEX "CodeOtp_utilisateurId_contexte_idx" ON "CodeOtp"("utilisateurId", "contexte");

-- CreateIndex
CREATE UNIQUE INDEX "Parcelle_nup_key" ON "Parcelle"("nup");

-- CreateIndex
CREATE INDEX "Parcelle_statut_idx" ON "Parcelle"("statut");

-- CreateIndex
CREATE INDEX "Parcelle_poleTerritorial_idx" ON "Parcelle"("poleTerritorial");

-- CreateIndex
CREATE UNIQUE INDEX "Titre_numeroTitre_key" ON "Titre"("numeroTitre");

-- CreateIndex
CREATE INDEX "Titre_parcelleId_idx" ON "Titre"("parcelleId");

-- CreateIndex
CREATE INDEX "Convention_parcelleId_idx" ON "Convention"("parcelleId");

-- CreateIndex
CREATE INDEX "PlanBornage_parcelleId_idx" ON "PlanBornage"("parcelleId");

-- CreateIndex
CREATE INDEX "MandataireFamille_proprietaireId_idx" ON "MandataireFamille"("proprietaireId");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureFamille_parcelleId_mandataireId_key" ON "SignatureFamille"("parcelleId", "mandataireId");

-- CreateIndex
CREATE INDEX "BanOpposition_parcelleId_idx" ON "BanOpposition"("parcelleId");

-- CreateIndex
CREATE INDEX "Opposition_banId_idx" ON "Opposition"("banId");

-- CreateIndex
CREATE INDEX "ConflitCsaf_parcelleId_idx" ON "ConflitCsaf"("parcelleId");

-- CreateIndex
CREATE INDEX "ConflitCsaf_statut_idx" ON "ConflitCsaf"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "MutationAudit_sequence_key" ON "MutationAudit"("sequence");

-- CreateIndex
CREATE INDEX "MutationAudit_parcelleId_idx" ON "MutationAudit"("parcelleId");

-- CreateIndex
CREATE INDEX "MutationAudit_horodatage_idx" ON "MutationAudit"("horodatage");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Proprietaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeOtp" ADD CONSTRAINT "CodeOtp_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelle" ADD CONSTRAINT "Parcelle_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Proprietaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Titre" ADD CONSTRAINT "Titre_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBornage" ADD CONSTRAINT "PlanBornage_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBornage" ADD CONSTRAINT "PlanBornage_signeParId_fkey" FOREIGN KEY ("signeParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandataireFamille" ADD CONSTRAINT "MandataireFamille_proprietaireId_fkey" FOREIGN KEY ("proprietaireId") REFERENCES "Proprietaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureFamille" ADD CONSTRAINT "SignatureFamille_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureFamille" ADD CONSTRAINT "SignatureFamille_mandataireId_fkey" FOREIGN KEY ("mandataireId") REFERENCES "MandataireFamille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanOpposition" ADD CONSTRAINT "BanOpposition_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opposition" ADD CONSTRAINT "Opposition_banId_fkey" FOREIGN KEY ("banId") REFERENCES "BanOpposition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflitCsaf" ADD CONSTRAINT "ConflitCsaf_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflitCsaf" ADD CONSTRAINT "ConflitCsaf_ouvertParId_fkey" FOREIGN KEY ("ouvertParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutationAudit" ADD CONSTRAINT "MutationAudit_parcelleId_fkey" FOREIGN KEY ("parcelleId") REFERENCES "Parcelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

