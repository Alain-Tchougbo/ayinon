/* eslint-disable no-console */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { RoleFamilial, RoleUtilisateur, StatutCession, StatutDeclarantVendeur, StatutParcelle, PoleTerritorial } from "@ayinon/shared";
import { hacherMotDePasse } from "../src/auth/password.util";

const prisma = new PrismaClient();

const MOT_DE_PASSE_DEMO = "Ayinon@2026";

function carre(centreLonLat: [number, number], demiCoteDeg = 0.00035) {
  const [lon, lat] = centreLonLat;
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [lon - demiCoteDeg, lat - demiCoteDeg],
        [lon + demiCoteDeg, lat - demiCoteDeg],
        [lon + demiCoteDeg, lat + demiCoteDeg],
        [lon - demiCoteDeg, lat + demiCoteDeg],
        [lon - demiCoteDeg, lat - demiCoteDeg],
      ],
    ],
  };
}

async function inserer(
  nup: string,
  centre: [number, number],
  statut: StatutParcelle,
  poleTerritorial: PoleTerritorial,
  commune: string,
  arrondissement: string,
  proprietaireId: string | null,
  demiCoteDeg = 0.00035,
) {
  const id = randomUUID();
  const geometrie = carre(centre, demiCoteDeg);
  const superficieM2 = Math.round((demiCoteDeg * 2 * 111_320) ** 2);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Parcelle"
      (id, nup, geom, "superficieM2", statut, "poleTerritorial", commune, arrondissement, "verrouAntiVente", "proprietaireId", "createdAt", "updatedAt")
    VALUES (
      ${id}, ${nup},
      ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometrie)}), 4326),
      ${superficieM2}, ${statut}::"StatutParcelle", ${poleTerritorial}::"PoleTerritorial",
      ${commune}, ${arrondissement}, false, ${proprietaireId}, now(), now()
    )
  `);
  return id;
}

async function main() {
  console.log("Nettoyage de la base (TRUNCATE CASCADE)...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "MutationAudit","ConflitCsaf","Opposition","BanOpposition","SignatureFamille",
      "MandataireFamille","PlanBornage","Convention","Titre","Parcelle","CodeOtp","RefreshToken",
      "Utilisateur","Proprietaire" CASCADE
  `);

  console.log("Creation des proprietaires...");
  const kodjo = await prisma.proprietaire.create({
    data: { nomComplet: "Kodjo AGBOSSOU", telephone: "+229 97 00 00 01", numeroPieceIdentite: "BJ-CIP-000101" },
  });
  const akouavi = await prisma.proprietaire.create({
    data: {
      nomComplet: "Akouavi HOUNSOU",
      telephone: "+33 6 00 00 00 02",
      estDiaspora: true,
      paysResidence: "France",
      numeroPieceIdentite: "BJ-CIP-000102",
    },
  });
  const famille = await prisma.proprietaire.create({
    data: { nomComplet: "Collectivite familiale DOSSOU (terre hereditaire)", numeroPieceIdentite: "BJ-CIP-000103" },
  });
  const aine = await prisma.proprietaire.create({ data: { nomComplet: "Elder Bio DOSSOU", telephone: "+229 97 00 00 03" } });
  const representanteFemmes = await prisma.proprietaire.create({
    data: { nomComplet: "Afiavi DOSSOU", telephone: "+229 97 00 00 04" },
  });
  const cadet = await prisma.proprietaire.create({ data: { nomComplet: "Fifame DOSSOU", telephone: "+229 97 00 00 05" } });
  const etat = await prisma.proprietaire.create({ data: { nomComplet: "Domaine de l'Etat beninois" } });
  const roukayath = await prisma.proprietaire.create({
    data: { nomComplet: "Roukayath ALAO", telephone: "+229 97 00 00 06", numeroPieceIdentite: "BJ-CIP-000107" },
  });

  console.log("Creation des comptes de demonstration...");
  const motDePasseHash = await hacherMotDePasse(MOT_DE_PASSE_DEMO);
  const comptes: Array<{
    email: string;
    role: RoleUtilisateur;
    nomComplet: string;
    proprietaireId?: string;
    poleTerritorial?: PoleTerritorial;
    statutDeclarant?: StatutDeclarantVendeur;
  }> = [
    { email: "citoyen1@ayinon.bj", role: RoleUtilisateur.CITOYEN, nomComplet: kodjo.nomComplet, proprietaireId: kodjo.id },
    { email: "diaspora1@ayinon.bj", role: RoleUtilisateur.CITOYEN, nomComplet: akouavi.nomComplet, proprietaireId: akouavi.id },
    {
      email: "vendeur1@ayinon.bj",
      role: RoleUtilisateur.VENDEUR,
      nomComplet: roukayath.nomComplet,
      proprietaireId: roukayath.id,
      statutDeclarant: StatutDeclarantVendeur.PROPRIETAIRE,
    },
    { email: "acheteur1@ayinon.bj", role: RoleUtilisateur.ACHETEUR, nomComplet: "Ganiou SALIFOU" },
    { email: "geometre1@ayinon.bj", role: RoleUtilisateur.GEOMETRE, nomComplet: "Cyriaque DOSSOU-YOVO (OGEB n.512)" },
    { email: "mandataire.aine@ayinon.bj", role: RoleUtilisateur.MANDATAIRE_FAMILIAL, nomComplet: aine.nomComplet, proprietaireId: aine.id },
    {
      email: "mandataire.femmes@ayinon.bj",
      role: RoleUtilisateur.MANDATAIRE_FAMILIAL,
      nomComplet: representanteFemmes.nomComplet,
      proprietaireId: representanteFemmes.id,
    },
    { email: "mandataire.cadet@ayinon.bj", role: RoleUtilisateur.MANDATAIRE_FAMILIAL, nomComplet: cadet.nomComplet, proprietaireId: cadet.id },
    {
      email: "andf.littoral@ayinon.bj",
      role: RoleUtilisateur.AGENT_ANDF,
      nomComplet: "Agent ANDF — Pole Littoral-Atlantique",
      poleTerritorial: PoleTerritorial.LITTORAL_ATLANTIQUE,
    },
    { email: "csaf1@ayinon.bj", role: RoleUtilisateur.MAGISTRAT_CSAF, nomComplet: "Magistrat CSAF — Cour Speciale des Affaires Foncieres" },
    { email: "banque1@ayinon.bj", role: RoleUtilisateur.AGENT_BANQUE, nomComplet: "Agent Credit — Microfinance ALAFIA" },
    { email: "admin@ayinon.bj", role: RoleUtilisateur.ADMIN, nomComplet: "Administrateur plateforme AYINON" },
  ];
  for (const compte of comptes) {
    await prisma.utilisateur.create({
      data: {
        email: compte.email,
        motDePasseHash,
        role: compte.role,
        nomComplet: compte.nomComplet,
        proprietaireId: compte.proprietaireId,
        poleTerritorial: compte.poleTerritorial,
        statutDeclarant: compte.statutDeclarant,
      },
    });
  }

  console.log("Creation des mandataires familiaux (protocole multi-signature)...");
  const mandataireAine = await prisma.mandataireFamille.create({ data: { proprietaireId: aine.id, role: RoleFamilial.AINE } });
  const mandataireFemmes = await prisma.mandataireFamille.create({
    data: { proprietaireId: representanteFemmes.id, role: RoleFamilial.REPRESENTANT_FEMMES },
  });
  const mandataireCadet = await prisma.mandataireFamille.create({ data: { proprietaireId: cadet.id, role: RoleFamilial.CADET } });

  console.log("Creation des parcelles cadastrales...");
  const cotonouTitree = await inserer(
    "BJ-LIT-COT-0001",
    [2.3912, 6.3703],
    StatutParcelle.TITREE,
    PoleTerritorial.LITTORAL_ATLANTIQUE,
    "Cotonou",
    "1er Arrondissement",
    kodjo.id,
  );
  await inserer(
    "BJ-LIT-COT-0002",
    [2.3922, 6.3706],
    StatutParcelle.EN_COURS,
    PoleTerritorial.LITTORAL_ATLANTIQUE,
    "Cotonou",
    "1er Arrondissement",
    akouavi.id,
  );
  await inserer(
    "BJ-LIT-CAL-0003",
    [2.3556, 6.4489],
    StatutParcelle.DOMAINE_PUBLIC,
    PoleTerritorial.LITTORAL_ATLANTIQUE,
    "Abomey-Calavi",
    "Godomey",
    etat.id,
    0.0006,
  );
  await inserer(
    "BJ-OUE-PN-0004",
    [2.6289, 6.4969],
    StatutParcelle.TITREE,
    PoleTerritorial.OUEME_PLATEAU,
    "Porto-Novo",
    "Centre-ville",
    kodjo.id,
  );
  const parcelleFamiliale = await inserer(
    "BJ-ZOU-ABM-0005",
    [1.9833, 7.1833],
    StatutParcelle.EN_COURS,
    PoleTerritorial.ZOU_COLLINES,
    "Abomey",
    "Quartier Djegan-Foy",
    famille.id,
    0.0008,
  );
  const parcelleLitige = await inserer(
    "BJ-BOR-PKO-0006",
    [2.6303, 9.3372],
    StatutParcelle.TITREE,
    PoleTerritorial.BORGOU_ALIBORI,
    "Parakou",
    "3e Arrondissement",
    akouavi.id,
  );
  await inserer(
    "BJ-ATA-NAT-0007",
    [1.3796, 10.3042],
    StatutParcelle.EN_COURS,
    PoleTerritorial.ATACORA_DONGA,
    "Natitingou",
    "Centre",
    null,
  );
  await inserer(
    "BJ-MOC-LOK-0008",
    [1.7167, 6.6389],
    StatutParcelle.TITREE,
    PoleTerritorial.MONO_COUFFO,
    "Lokossa",
    "Centre",
    kodjo.id,
  );
  const parcelleVendeur = await inserer(
    "BJ-LIT-COT-0009",
    [2.3945, 6.3688],
    StatutParcelle.TITREE,
    PoleTerritorial.LITTORAL_ATLANTIQUE,
    "Cotonou",
    "3e Arrondissement",
    roukayath.id,
  );
  const parcelleVenteHistorique = await inserer(
    "BJ-LIT-COT-0010",
    [2.3968, 6.3675],
    StatutParcelle.TITREE,
    PoleTerritorial.LITTORAL_ATLANTIQUE,
    "Cotonou",
    "3e Arrondissement",
    kodjo.id,
  );

  console.log("Insertion d'une cession historique validee (peuple l'estimation de prix par commune)...");
  await prisma.convention.create({
    data: {
      parcelleId: parcelleVenteHistorique,
      vendeurNom: "Ancien proprietaire (avant AYINON)",
      acquereurNom: kodjo.nomComplet,
      montantFcfa: 18_000_000,
      hashSha256: "0".repeat(64),
      signatureEd25519: "",
      qrPayload: {},
      statutCession: StatutCession.VALIDEE,
    },
  });

  console.log("Ouverture d'un protocole de multi-signature familiale sur une parcelle hereditaire...");
  await prisma.signatureFamille.createMany({
    data: [
      { parcelleId: parcelleFamiliale, mandataireId: mandataireAine.id, role: RoleFamilial.AINE },
      { parcelleId: parcelleFamiliale, mandataireId: mandataireFemmes.id, role: RoleFamilial.REPRESENTANT_FEMMES },
      { parcelleId: parcelleFamiliale, mandataireId: mandataireCadet.id, role: RoleFamilial.CADET },
    ],
  });

  console.log("Ouverture d'un conflit CSAF de demonstration...");
  const csaf = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "csaf1@ayinon.bj" } });
  await prisma.$transaction([
    prisma.conflitCsaf.create({
      data: {
        parcelleId: parcelleLitige,
        motif: "Double vente alleguee — deux conventions concurrentes deposees pour la meme parcelle",
        referenceDossierJudiciaire: "CSAF-2026-000042",
        statutParcelleAvantGel: StatutParcelle.TITREE,
        ouvertParId: csaf.id,
      },
    }),
    prisma.parcelle.update({ where: { id: parcelleLitige }, data: { statut: StatutParcelle.GEL_CSAF } }),
  ]);

  console.log("Cree :");
  console.log(`  - Parcelle titree prete pour le scenario 'import de bornage en chevauchement' : ${cotonouTitree}`);
  console.log(`  - Parcelle sous gel CSAF (rouge) : ${parcelleLitige}`);
  console.log(`  - Parcelle familiale en attente de multi-signature : ${parcelleFamiliale}`);
  console.log(`\nComptes de demonstration (mot de passe commun : ${MOT_DE_PASSE_DEMO}) :`);
  for (const compte of comptes) {
    console.log(`  - ${compte.email.padEnd(28)} ${compte.role}`);
  }
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
