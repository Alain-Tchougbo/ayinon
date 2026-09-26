/* eslint-disable no-console */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  ModeVisite,
  RoleFamilial,
  RoleUtilisateur,
  SourceBati,
  StatutAnnonce,
  StatutBan,
  StatutCession,
  StatutConflitCsaf,
  StatutDeclarantVendeur,
  StatutDemandeFinancement,
  StatutHypotheque,
  StatutInteret,
  StatutOpposition,
  StatutParcelle,
  StatutSequestre,
  StatutSignalement,
  StatutVisite,
  PoleTerritorial,
  TypeDecisionCsaf,
  TypeSignalement,
  TypeUsageSol,
} from "@ayinon/shared";
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

async function insererBati(
  centre: [number, number],
  source: SourceBati,
  options: { parcelleId?: string | null; scoreConfiance?: number; valide?: boolean; valideParId?: string } = {},
) {
  const id = randomUUID();
  const geometrie = carre(centre, 0.00008);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "Bati" (id, geom, source, "scoreConfiance", "parcelleId", valide, "valideParId", "createdAt", "updatedAt")
    VALUES (
      ${id},
      ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometrie)}), 4326),
      ${source}::"SourceBati",
      ${options.scoreConfiance ?? null},
      ${options.parcelleId ?? null},
      ${options.valide ?? false},
      ${options.valideParId ?? null},
      now(), now()
    )
  `);
  return id;
}

async function insererZoneOccupationSol(centre: [number, number], typeUsage: TypeUsageSol, demiCoteDeg = 0.004) {
  const id = randomUUID();
  const geometrie = carre(centre, demiCoteDeg);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "ZoneOccupationSol" (id, geom, "typeUsage", source, "createdAt")
    VALUES (
      ${id},
      ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometrie)}), 4326),
      ${typeUsage}::"TypeUsageSol",
      'ESA_WORLDCOVER_2021',
      now()
    )
  `);
  return id;
}

/** Plan de bornage : geometrie inseree en brut (Unsupported("geometry") sur PlanBornage,
 * comme Parcelle/Bati), le reste des champs via le client Prisma normal. */
async function insererPlanBornage(donnees: {
  parcelleId: string;
  centre: [number, number];
  referenceDossier: string;
  chevauchementDetecte?: boolean;
  parcellesEnConflit?: string[];
  numeroOrdreOgeb?: string;
  signeParId?: string;
  importeParId?: string;
}) {
  const id = randomUUID();
  const geometrie = carre(donnees.centre, 0.00035);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "PlanBornage"
      (id, "parcelleId", geometrie, "referenceDossier", "chevauchementDetecte", "parcellesEnConflit",
       "numeroOrdreOgeb", "hashSha256", "signatureEd25519", "signeParId", "importeParId", "createdAt")
    VALUES (
      ${id}, ${donnees.parcelleId},
      ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geometrie)}), 4326),
      ${donnees.referenceDossier}, ${donnees.chevauchementDetecte ?? false}, ${donnees.parcellesEnConflit ?? []},
      ${donnees.numeroOrdreOgeb ?? null}, ${"0".repeat(64)}, ${donnees.signeParId ? "0".repeat(128) : null},
      ${donnees.signeParId ?? null}, ${donnees.importeParId ?? null}, now()
    )
  `);
  return id;
}

/** Communes reelles reparties sur les 6 poles territoriaux, avec un centre approximatif — sert a
 * generer un volume realiste de parcelles/annonces sans se limiter a une poignee de scenarios. */
const COMMUNES: Array<{ pole: PoleTerritorial; commune: string; abrev: string; arrondissement: string; centre: [number, number] }> = [
  { pole: PoleTerritorial.LITTORAL_ATLANTIQUE, commune: "Cotonou", abrev: "COT", arrondissement: "6e Arrondissement", centre: [2.4123, 6.3728] },
  { pole: PoleTerritorial.LITTORAL_ATLANTIQUE, commune: "Abomey-Calavi", abrev: "CAL", arrondissement: "Zinvie", centre: [2.3333, 6.4667] },
  { pole: PoleTerritorial.LITTORAL_ATLANTIQUE, commune: "Ouidah", abrev: "OUI", arrondissement: "Centre", centre: [2.0852, 6.3628] },
  { pole: PoleTerritorial.OUEME_PLATEAU, commune: "Porto-Novo", abrev: "PNO", arrondissement: "Oganla", centre: [2.6167, 6.4833] },
  { pole: PoleTerritorial.OUEME_PLATEAU, commune: "Seme-Podji", abrev: "SEM", arrondissement: "Djeffa", centre: [2.6193, 6.3667] },
  { pole: PoleTerritorial.OUEME_PLATEAU, commune: "Adjarra", abrev: "ADJ", arrondissement: "Centre", centre: [2.6667, 6.5167] },
  { pole: PoleTerritorial.MONO_COUFFO, commune: "Lokossa", abrev: "LOK", arrondissement: "Ouedeme-Pedah", centre: [1.7222, 6.6444] },
  { pole: PoleTerritorial.MONO_COUFFO, commune: "Dogbo", abrev: "DOG", arrondissement: "Centre", centre: [1.7833, 6.8] },
  { pole: PoleTerritorial.MONO_COUFFO, commune: "Aplahoue", abrev: "APL", arrondissement: "Centre", centre: [1.6833, 7.0] },
  { pole: PoleTerritorial.ZOU_COLLINES, commune: "Abomey", abrev: "ABM", arrondissement: "Djegan-Foy", centre: [1.9931, 7.1828] },
  { pole: PoleTerritorial.ZOU_COLLINES, commune: "Bohicon", abrev: "BOH", arrondissement: "Centre", centre: [2.0667, 7.1833] },
  { pole: PoleTerritorial.ZOU_COLLINES, commune: "Savalou", abrev: "SAV", arrondissement: "Centre", centre: [1.9667, 7.9333] },
  { pole: PoleTerritorial.BORGOU_ALIBORI, commune: "Parakou", abrev: "PKO", arrondissement: "1er Arrondissement", centre: [2.6089, 9.3372] },
  { pole: PoleTerritorial.BORGOU_ALIBORI, commune: "Kandi", abrev: "KAN", arrondissement: "Centre", centre: [2.9333, 11.1333] },
  { pole: PoleTerritorial.BORGOU_ALIBORI, commune: "N'Dali", abrev: "NDA", arrondissement: "Centre", centre: [2.7, 9.85] },
  { pole: PoleTerritorial.ATACORA_DONGA, commune: "Natitingou", abrev: "NAT", arrondissement: "Centre", centre: [1.3796, 10.3042] },
  { pole: PoleTerritorial.ATACORA_DONGA, commune: "Djougou", abrev: "DJO", arrondissement: "Centre", centre: [1.6667, 9.7] },
  { pole: PoleTerritorial.ATACORA_DONGA, commune: "Tanguieta", abrev: "TAN", arrondissement: "Centre", centre: [1.2667, 10.6167] },
];

let compteurNup = 11;
function prochainNup(abrevPole: string, abrevCommune: string): string {
  return `BJ-${abrevPole}-${abrevCommune}-${String(compteurNup++).padStart(4, "0")}`;
}
const ABREV_POLE: Record<PoleTerritorial, string> = {
  LITTORAL_ATLANTIQUE: "LIT",
  OUEME_PLATEAU: "OUE",
  MONO_COUFFO: "MOC",
  ZOU_COLLINES: "ZOU",
  BORGOU_ALIBORI: "BOR",
  ATACORA_DONGA: "ATA",
};

async function main() {
  console.log("Nettoyage de la base (TRUNCATE CASCADE)...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "MutationAudit","ConflitCsaf","Opposition","BanOpposition","SignatureFamille",
      "MandataireFamille","PlanBornage","Sequestre","Avis","Hypotheque","DemandeFinancement",
      "Visite","InteretAchat","RechercheSauvegardee","Titre","Convention","Annonce","Signalement",
      "Bati","ZoneOccupationSol","MessageChatbot","ConversationChatbot","Parcelle","CodeOtp",
      "RefreshToken","Utilisateur","Proprietaire" CASCADE
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

  // Proprietaires supplementaires (sans compte de connexion) : peuplent le volume de parcelles et
  // le registre foncier du back-office, sans multiplier les comptes de demonstration eux-memes.
  const nomsProprietairesSupplementaires = [
    "Innocent HOUNKPATIN",
    "Bernadette ADJOVI",
    "Sylvain KOUDOGBO",
    "Rachidatou GBAGUIDI",
    "Boni SEIDOU",
    "Mariam TAMOU",
    "Pascal ZINSOU",
    "Clarisse HOUESSOU",
    "Alassane YARA",
    "Judith AZANMASSO",
    "Theophile GNONLONFOUN",
    "Chantal AHOYO",
  ];
  const proprietairesSupplementaires: Array<Awaited<ReturnType<typeof prisma.proprietaire.create>>> = [];
  for (const [index, nomComplet] of nomsProprietairesSupplementaires.entries()) {
    proprietairesSupplementaires.push(
      await prisma.proprietaire.create({
        data: { nomComplet, telephone: `+229 96 ${String(10 + index).padStart(2, "0")} 00 0${index % 10}` },
      }),
    );
  }

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
    {
      email: "vendeur2@ayinon.bj",
      role: RoleUtilisateur.VENDEUR,
      nomComplet: "Innocent HOUNKPATIN",
      proprietaireId: proprietairesSupplementaires[0]!.id,
      statutDeclarant: StatutDeclarantVendeur.PROPRIETAIRE,
    },
    { email: "acheteur1@ayinon.bj", role: RoleUtilisateur.ACHETEUR, nomComplet: "Ganiou SALIFOU" },
    { email: "acheteur2@ayinon.bj", role: RoleUtilisateur.ACHETEUR, nomComplet: "Latifatou OROU" },
    { email: "geometre1@ayinon.bj", role: RoleUtilisateur.GEOMETRE, nomComplet: "Cyriaque DOSSOU-YOVO (OGEB n.512)" },
    { email: "geometre2@ayinon.bj", role: RoleUtilisateur.GEOMETRE, nomComplet: "Solange AHOUANSOU (OGEB n.734)" },
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
    {
      email: "andf.borgou@ayinon.bj",
      role: RoleUtilisateur.AGENT_ANDF,
      nomComplet: "Agent ANDF — Pole Borgou-Alibori",
      poleTerritorial: PoleTerritorial.BORGOU_ALIBORI,
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

  console.log("Creation des parcelles cadastrales (scenarios nommes)...");
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

  console.log("Creation d'un volume de parcelles supplementaires (2-3 par commune, 6 poles)...");
  const parcellesBulk: Array<{ id: string; commune: string; pole: PoleTerritorial; proprietaireId: string | null }> = [];
  const bassinProprietaires = [kodjo.id, akouavi.id, roukayath.id, ...proprietairesSupplementaires.map((p) => p.id), null];
  let indexGlobal = 0;
  for (const c of COMMUNES) {
    const parParCommune = 3;
    for (let i = 0; i < parParCommune; i++) {
      const statut =
        i === 0 ? StatutParcelle.TITREE : i === 1 ? StatutParcelle.EN_COURS : indexGlobal % 9 === 0 ? StatutParcelle.DOMAINE_PUBLIC : StatutParcelle.TITREE;
      const proprietaireId = statut === StatutParcelle.DOMAINE_PUBLIC ? etat.id : bassinProprietaires[indexGlobal % bassinProprietaires.length]!;
      const centre: [number, number] = [c.centre[0] + i * 0.0016 - 0.0016, c.centre[1] + i * 0.0012 - 0.0006];
      const id = await inserer(
        prochainNup(ABREV_POLE[c.pole], c.abrev),
        centre,
        statut,
        c.pole,
        c.commune,
        c.arrondissement,
        proprietaireId,
      );
      parcellesBulk.push({ id, commune: c.commune, pole: c.pole, proprietaireId });
      indexGlobal++;
    }
  }
  // Deux parcelles supplementaires directement rattachees au compte citoyen1, pour que "Mes
  // parcelles" et le passeport foncier presentent un volume realiste (pas seulement 4).
  const parcelleKodjoSupp1 = await inserer(prochainNup("MOC", "DOG"), [1.7843, 6.8006], StatutParcelle.TITREE, PoleTerritorial.MONO_COUFFO, "Dogbo", "Centre", kodjo.id);
  const parcelleKodjoSupp2 = await inserer(prochainNup("ZOU", "BOH"), [2.0673, 7.1839], StatutParcelle.EN_COURS, PoleTerritorial.ZOU_COLLINES, "Bohicon", "Centre", kodjo.id);
  const parcelleAkouaviSupp = await inserer(prochainNup("OUE", "SEM"), [2.6199, 6.3673], StatutParcelle.TITREE, PoleTerritorial.OUEME_PLATEAU, "Seme-Podji", "Djeffa", akouavi.id);

  console.log("Publication d'annonces de demonstration (vitrine des terrains a vendre)...");
  const vendeur1 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "vendeur1@ayinon.bj" } });
  const vendeur2 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "vendeur2@ayinon.bj" } });
  const andfLittoral = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "andf.littoral@ayinon.bj" } });
  const andfBorgou = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "andf.borgou@ayinon.bj" } });
  const acheteur1 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "acheteur1@ayinon.bj" } });
  const acheteur2 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "acheteur2@ayinon.bj" } });
  const parcellePortoNovo = await prisma.parcelle.findUniqueOrThrow({ where: { nup: "BJ-OUE-PN-0004" } });
  const parcelleLokossa = await prisma.parcelle.findUniqueOrThrow({ where: { nup: "BJ-MOC-LOK-0008" } });

  const annonce1 = await prisma.annonce.create({
    data: {
      // Vitrine complete : badge ANDF + exclusivite temporaire en cours (E4.5), pour verifier
      // le rendu de tous les badges simultanement sur une meme carte.
      parcelleId: parcelleVendeur,
      publieeParId: vendeur1.id,
      prixIndicatifFcfa: 35_000_000,
      description: "Parcelle titree, viabilisee, proche de la voie bitumee — ideale pour habitation.",
      verifieeParAndfId: andfLittoral.id,
      dateVerificationAndf: new Date(),
      exclusiviteAcheteurId: acheteur1.id,
      exclusiviteJusqua: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });
  const annonce2 = await prisma.annonce.create({
    data: {
      // Carte simple, sans badge : prix indicatif renseigne, aucune verification ANDF encore.
      parcelleId: parcellePortoNovo.id,
      publieeParId: vendeur1.id,
      prixIndicatifFcfa: 12_500_000,
    },
  });
  const annonce3 = await prisma.annonce.create({
    data: {
      // Prix "a discuter" (prixIndicatifFcfa null) : verifie ce cas d'affichage specifique.
      parcelleId: parcelleLokossa.id,
      publieeParId: vendeur1.id,
      description: "Terrain agricole en bordure de route nationale, potentiel construction.",
    },
  });

  // Volume d'annonces supplementaires (vitrine realiste, statuts varies) sur des parcelles du lot
  // "bulk" possedees par vendeur1/vendeur2 — on ne publie que sur des parcelles TITREE/EN_COURS,
  // jamais DOMAINE_PUBLIC ou GEL_CSAF (coherent avec les regles metier reelles).
  const parcellesPubliablesVendeur1 = parcellesBulk.filter((p) => p.proprietaireId === roukayath.id);
  const parcellesPubliablesVendeur2 = parcellesBulk.filter((p) => p.proprietaireId === proprietairesSupplementaires[0]!.id);
  const descriptionsAnnonces = [
    "Terrain clos de murs, acces direct au bitume, quartier residentiel calme.",
    "Belle vue degagee, ideal pour projet hotelier ou residence secondaire.",
    "Proche marche central et ecoles, fort potentiel locatif.",
    "Terrain plat, aucun risque d'inondation constate, viabilise (eau + electricite a proximite).",
    "Zone en pleine expansion, plusieurs constructions recentes aux alentours.",
    "Acces par piste laterite carrossable toute l'annee, calme et securise.",
  ];
  const annoncesBulk: Array<{ id: string; parcelleId: string; publieeParId: string; statut: StatutAnnonce }> = [
    { id: annonce1.id, parcelleId: parcelleVendeur, publieeParId: vendeur1.id, statut: StatutAnnonce.ACTIVE },
    { id: annonce2.id, parcelleId: parcellePortoNovo.id, publieeParId: vendeur1.id, statut: StatutAnnonce.ACTIVE },
    { id: annonce3.id, parcelleId: parcelleLokossa.id, publieeParId: vendeur1.id, statut: StatutAnnonce.ACTIVE },
  ];
  let compteurAnnonce = 0;
  for (const p of [...parcellesPubliablesVendeur1, ...parcellesPubliablesVendeur2]) {
    if (p.commune === "Abomey-Calavi" && p.proprietaireId === etat.id) continue; // domaine public, jamais en vente
    const prix = 6_000_000 + (compteurAnnonce % 8) * 3_500_000;
    const statut = compteurAnnonce % 11 === 0 ? StatutAnnonce.VENDUE : compteurAnnonce % 7 === 0 ? StatutAnnonce.RETIREE : StatutAnnonce.ACTIVE;
    const publieeParId = parcellesPubliablesVendeur1.includes(p) ? vendeur1.id : vendeur2.id;
    const creee = await prisma.annonce.create({
      data: {
        parcelleId: p.id,
        publieeParId,
        prixIndicatifFcfa: prix,
        description: descriptionsAnnonces[compteurAnnonce % descriptionsAnnonces.length],
        statut,
        retireeLe: statut === StatutAnnonce.RETIREE ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) : null,
        verifieeParAndfId: compteurAnnonce % 3 === 0 ? andfLittoral.id : compteurAnnonce % 5 === 0 ? andfBorgou.id : null,
        dateVerificationAndf: compteurAnnonce % 3 === 0 || compteurAnnonce % 5 === 0 ? new Date() : null,
      },
    });
    annoncesBulk.push({ id: creee.id, parcelleId: p.id, publieeParId, statut });
    compteurAnnonce++;
  }
  const annoncesActives = annoncesBulk.filter((a) => a.statut === StatutAnnonce.ACTIVE);

  console.log("Manifestations d'interet et demandes de visite (acheteurs)...");
  const acheteurs = [acheteur1.id, acheteur2.id];
  for (const [i, a] of annoncesActives.slice(0, 10).entries()) {
    const acheteurId = acheteurs[i % acheteurs.length]!;
    const statutInteret = i % 4 === 0 ? StatutInteret.RETENU : i % 4 === 1 ? StatutInteret.DECLINE : StatutInteret.EN_ATTENTE;
    try {
      await prisma.interetAchat.create({
        data: {
          annonceId: a.id,
          acheteurId,
          statut: statutInteret,
          message: i % 2 === 0 ? "Bonjour, ce terrain m'interesse, puis-je avoir plus de details sur les acces ?" : null,
        },
      });
    } catch {
      // @@unique([annonceId, acheteurId]) : ignore les doublons improbables du cyclage.
    }
  }
  const modesVisite = [ModeVisite.PRESENTIEL, ModeVisite.VIDEO];
  for (const [i, a] of annoncesActives.slice(0, 6).entries()) {
    const acheteurId = acheteurs[i % acheteurs.length]!;
    const statutVisite = i % 3 === 0 ? StatutVisite.REPROGRAMMEE : i % 3 === 1 ? StatutVisite.CONFIRMEE : StatutVisite.DEMANDEE;
    await prisma.visite.create({
      data: {
        annonceId: a.id,
        acheteurId,
        mode: modesVisite[i % modesVisite.length]!,
        dateProposee: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000),
        messageAcheteur: "Disponible en matinee de preference.",
        statut: statutVisite,
        nouvelleDateProposee: statutVisite === StatutVisite.REPROGRAMMEE ? new Date(Date.now() + (i + 5) * 24 * 60 * 60 * 1000) : null,
        traiteeLe: statutVisite !== StatutVisite.DEMANDEE ? new Date() : null,
      },
    });
  }

  console.log("Recherches sauvegardees (E3.2, alertes in-app)...");
  await prisma.rechercheSauvegardee.create({
    data: {
      nom: "Cotonou, moins de 20M FCFA",
      acheteurId: acheteur1.id,
      commune: "Cotonou",
      prixMaxFcfa: 20_000_000,
      verifieeAndf: true,
      // Consultee il y a 6 jours : les annonces creees depuis remontent comme "nouvelles".
      derniereConsultation: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.rechercheSauvegardee.create({
    data: {
      nom: "Terrains agricoles, toutes communes",
      acheteurId: acheteur2.id,
      superficieMinM2: 3000,
      derniereConsultation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Insertion d'une cession historique validee (peuple l'estimation de prix par commune)...");
  const conventionHistorique = await prisma.convention.create({
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

  console.log("Insertion d'un historique proprietaires + litige judiciaire resolu sur des parcelles avec annonce active...");
  const csaf = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "csaf1@ayinon.bj" } });
  // Demontre l'historique public consulte par un acheteur (GET /parcelles/:id/historique) sur une
  // parcelle reellement en vitrine : mutation anterieure vers le vendeur actuel.
  const conventionVendeur = await prisma.convention.create({
    data: {
      parcelleId: parcelleVendeur,
      vendeurNom: "Ancien proprietaire (avant AYINON)",
      acquereurNom: roukayath.nomComplet,
      montantFcfa: 22_000_000,
      hashSha256: "0".repeat(64),
      signatureEd25519: "",
      qrPayload: {},
      statutCession: StatutCession.VALIDEE,
      createdAt: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
    },
  });
  // Litige judiciaire deja resolu (pas actif) sur une autre parcelle en vitrine, pour verifier le
  // rendu "transparence apres resolution" plutot que le seul cas de gel bloquant.
  await prisma.conflitCsaf.create({
    data: {
      parcelleId: parcelleLokossa.id,
      motif: "Opposition d'un voisin sur la delimitation lors du bornage initial",
      referenceDossierJudiciaire: "CSAF-2024-000017",
      statut: StatutConflitCsaf.LEVE,
      statutParcelleAvantGel: StatutParcelle.TITREE,
      ouvertParId: csaf.id,
      dateGel: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
      dateLevee: new Date(Date.now() - 545 * 24 * 60 * 60 * 1000),
      motifLevee: "Bornage contradictoire realise, limites confirmees par le geometre — opposition levee",
      typeDecision: TypeDecisionCsaf.LEVEE_SIMPLE,
    },
  });

  console.log("Cessions supplementaires (historique de prix + titres delivres + workflow en cours)...");
  // Plusieurs cessions VALIDEES sur des parcelles du lot bulk (chacune delivre un vrai Titre),
  // pour peupler le registre foncier et l'estimation de prix par commune sur plusieurs communes.
  const parcellesPourCessionHistorique = parcellesBulk.filter((p) => p.proprietaireId && p.proprietaireId !== etat.id).slice(0, 8);
  let sequenceTitre = 1;
  for (const p of parcellesPourCessionHistorique) {
    const montant = 8_000_000 + (sequenceTitre % 6) * 2_800_000;
    const convention = await prisma.convention.create({
      data: {
        parcelleId: p.id,
        vendeurNom: "Ancien proprietaire (avant AYINON)",
        acquereurNom: "Nouvel acquereur (dossier clos)",
        montantFcfa: montant,
        hashSha256: "0".repeat(64),
        signatureEd25519: "",
        qrPayload: {},
        statutCession: StatutCession.VALIDEE,
        acquereurId: sequenceTitre % 2 === 0 ? acheteur1.id : acheteur2.id,
        valideParId: p.pole === PoleTerritorial.BORGOU_ALIBORI ? andfBorgou.id : andfLittoral.id,
        dateValidation: new Date(Date.now() - sequenceTitre * 40 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - sequenceTitre * 45 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.titre.create({
      data: {
        parcelleId: p.id,
        numeroTitre: `BJ-TITRE-2025-${String(sequenceTitre).padStart(6, "0")}`,
        dateDelivrance: new Date(Date.now() - sequenceTitre * 40 * 24 * 60 * 60 * 1000),
        hashSha256: "0".repeat(64),
        signatureEd25519: "0".repeat(128),
        conventionId: convention.id,
      },
    });
    sequenceTitre++;
  }
  // Une cession en cours de negociation (PROPOSEE) et une acceptee en attente de validation ANDF
  // (ACCEPTEE) : couvrent les etapes intermediaires du workflow, pas seulement l'etat final.
  const parcellePourCessionProposee = parcellesBulk.find((p) => p.commune === "Bohicon" && p.proprietaireId)!;
  await prisma.convention.create({
    data: {
      parcelleId: parcellePourCessionProposee.id,
      vendeurNom: "Proprietaire actuel",
      acquereurNom: "Ganiou SALIFOU",
      montantFcfa: 14_500_000,
      hashSha256: "0".repeat(64),
      signatureEd25519: "",
      qrPayload: {},
      statutCession: StatutCession.PROPOSEE,
      acquereurId: acheteur1.id,
    },
  });
  const parcellePourCessionAcceptee = parcellesBulk.find((p) => p.commune === "Parakou" && p.proprietaireId)!;
  await prisma.convention.create({
    data: {
      parcelleId: parcellePourCessionAcceptee.id,
      vendeurNom: "Proprietaire actuel",
      acquereurNom: "Latifatou OROU",
      montantFcfa: 9_800_000,
      hashSha256: "0".repeat(64),
      signatureEd25519: "",
      qrPayload: {},
      statutCession: StatutCession.ACCEPTEE,
      acquereurId: acheteur2.id,
      dateAcceptation: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Avis (E5.x) sur des cessions validees...");
  await prisma.avis.create({
    data: { conventionId: conventionVendeur.id, note: 5, commentaire: "Transaction serieuse, delais respectes.", auteurId: acheteur1.id, citeId: vendeur1.id },
  });
  await prisma.avis.create({
    data: { conventionId: conventionHistorique.id, note: 4, commentaire: "Bon echange, quelques delais administratifs.", auteurId: acheteur2.id, citeId: vendeur1.id },
  });

  console.log("Sequestres (suivi de statut, sans mouvement d'argent reel)...");
  await prisma.sequestre.create({
    data: {
      conventionId: conventionHistorique.id,
      montantFcfa: 18_000_000,
      statut: StatutSequestre.LIBERE,
      declareParId: acheteur1.id,
      dateDeclaration: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      confirmeParId: andfLittoral.id,
      dateConfirmation: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000),
      dateLiberation: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.sequestre.create({
    data: {
      conventionId: conventionVendeur.id,
      montantFcfa: 22_000_000,
      statut: StatutSequestre.DEPOT_CONFIRME,
      declareParId: acheteur2.id,
      confirmeParId: andfLittoral.id,
      dateConfirmation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Hypotheques (verification de solvabilite)...");
  const parcellesHypothequables = parcellesBulk.filter((p) => p.proprietaireId && p.proprietaireId !== etat.id).slice(8, 12);
  const banque1 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "banque1@ayinon.bj" } });
  for (const [i, p] of parcellesHypothequables.entries()) {
    await prisma.hypotheque.create({
      data: {
        parcelleId: p.id,
        banqueNom: "Microfinance ALAFIA",
        montantGarantiFcfa: 5_000_000 + i * 2_000_000,
        statut: i === 0 ? StatutHypotheque.LEVEE : StatutHypotheque.ACTIVE,
        inscriteParId: banque1.id,
        dateInscription: new Date(Date.now() - (i + 1) * 60 * 24 * 60 * 60 * 1000),
        leveeParId: i === 0 ? banque1.id : null,
        dateLevee: i === 0 ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  console.log("Demandes de financement (E4.6-E4.8)...");
  const demandesFinancement: Array<{ statut: StatutDemandeFinancement; acheteurId: string; annonceId?: string }> = [
    { statut: StatutDemandeFinancement.EN_ATTENTE, acheteurId: acheteur1.id, annonceId: annoncesActives[0]?.id },
    { statut: StatutDemandeFinancement.EN_ATTENTE, acheteurId: acheteur2.id },
    { statut: StatutDemandeFinancement.ACCORD_PRINCIPE, acheteurId: acheteur1.id, annonceId: annoncesActives[1]?.id },
    { statut: StatutDemandeFinancement.REFUSEE, acheteurId: acheteur2.id, annonceId: annoncesActives[2]?.id },
  ];
  for (const [i, d] of demandesFinancement.entries()) {
    await prisma.demandeFinancement.create({
      data: {
        montantSouhaiteFcfa: 4_000_000 + i * 1_500_000,
        statut: d.statut,
        acheteurId: d.acheteurId,
        annonceId: d.annonceId,
        traiteeParId: d.statut === StatutDemandeFinancement.EN_ATTENTE ? null : banque1.id,
        dateTraitement: d.statut === StatutDemandeFinancement.EN_ATTENTE ? null : new Date(),
        montantAccordeFcfa: d.statut === StatutDemandeFinancement.ACCORD_PRINCIPE ? 3_800_000 : null,
        motifRefus: d.statut === StatutDemandeFinancement.REFUSEE ? "Revenus insuffisants au regard du montant demande" : null,
        codeVerification: `FIN-${String(i + 1).padStart(4, "0")}`,
      },
    });
  }

  console.log("Plans de bornage (geometres)...");
  const geometre1 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "geometre1@ayinon.bj" } });
  const geometre2 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "geometre2@ayinon.bj" } });
  const parcellesPourBornage = parcellesBulk.filter((p) => p.proprietaireId && p.proprietaireId !== etat.id).slice(12, 17);
  for (const [i, p] of parcellesPourBornage.entries()) {
    const importeParId = i % 2 === 0 ? geometre1.id : geometre2.id;
    const chevauchement = i === 1;
    await insererPlanBornage({
      parcelleId: p.id,
      centre: COMMUNES.find((c) => c.commune === p.commune)!.centre,
      referenceDossier: `DOSSIER-${p.commune.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)}-${String(i + 1).padStart(3, "0")}`,
      chevauchementDetecte: chevauchement,
      numeroOrdreOgeb: importeParId === geometre1.id ? "512" : "734",
      importeParId,
      signeParId: i % 3 !== 0 ? importeParId : undefined,
    });
  }

  console.log("Ouverture d'un protocole de multi-signature familiale sur une parcelle hereditaire...");
  await prisma.signatureFamille.createMany({
    data: [
      { parcelleId: parcelleFamiliale, mandataireId: mandataireAine.id, role: RoleFamilial.AINE },
      { parcelleId: parcelleFamiliale, mandataireId: mandataireFemmes.id, role: RoleFamilial.REPRESENTANT_FEMMES },
      { parcelleId: parcelleFamiliale, mandataireId: mandataireCadet.id, role: RoleFamilial.CADET },
    ],
  });

  console.log("Bans d'opposition (affichage public avant mutation d'une terre familiale)...");
  const banFamille = await prisma.banOpposition.create({
    data: { parcelleId: parcelleFamiliale, dateFin: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), statut: StatutBan.OUVERT },
  });
  await prisma.opposition.create({
    data: {
      banId: banFamille.id,
      opposantNom: "Voisin limitrophe non identifie sur l'acte initial",
      opposantContact: "+229 97 11 22 33",
      motif: "Conteste la limite ouest telle que dessinee sur le plan de bornage initial",
      statut: StatutOpposition.EN_EXAMEN,
    },
  });
  const banClos = await prisma.banOpposition.create({
    data: {
      parcelleId: parcelleVenteHistorique,
      dateDebut: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      dateFin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      statut: StatutBan.CLOS_SANS_OPPOSITION,
    },
  });
  void banClos;

  console.log("Ouverture d'un conflit CSAF de demonstration...");
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
  // Second gel actif, sur une parcelle du lot bulk, pour que la console CSAF ne montre pas un
  // seul dossier isole.
  const parcellePourGel2 = parcellesBulk.find((p) => p.commune === "Kandi" && p.proprietaireId)!;
  await prisma.$transaction([
    prisma.conflitCsaf.create({
      data: {
        parcelleId: parcellePourGel2.id,
        motif: "Heritier conteste la vente realisee par un cousin sans mandat de la famille",
        referenceDossierJudiciaire: "CSAF-2026-000058",
        statutParcelleAvantGel: StatutParcelle.TITREE,
        ouvertParId: csaf.id,
      },
    }),
    prisma.parcelle.update({ where: { id: parcellePourGel2.id }, data: { statut: StatutParcelle.GEL_CSAF } }),
  ]);

  console.log("Signalements (moderation d'annonces + litiges fonciers)...");
  const citoyen1 = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "citoyen1@ayinon.bj" } });
  const mandataireAineUtilisateur = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "mandataire.aine@ayinon.bj" } });
  const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: "admin@ayinon.bj" } });
  const signalements: Array<{
    type: (typeof TypeSignalement)[keyof typeof TypeSignalement];
    parcelleId: string;
    annonceId?: string;
    motif: string;
    descriptif?: string;
    statut: (typeof StatutSignalement)[keyof typeof StatutSignalement];
    signalantId: string;
    qualifieParId?: string;
    decisionMotif?: string;
  }> = [
    {
      type: TypeSignalement.ANNONCE,
      parcelleId: parcelleLokossa.id,
      annonceId: annonce3.id,
      motif: "Prix suspect sur une annonce a Cotonou",
      descriptif: "Le prix indicatif semble tres inferieur a la moyenne constatee sur la meme commune.",
      statut: StatutSignalement.FONDE,
      signalantId: citoyen1.id,
      qualifieParId: admin.id,
      decisionMotif: "Ecart confirme par rapport aux ventes recentes similaires — annonce mise en revue.",
    },
    {
      type: TypeSignalement.ANNONCE,
      parcelleId: annoncesActives[3] ? annoncesBulk[3]!.parcelleId : parcelleVendeur,
      annonceId: annoncesActives[3]?.id,
      motif: "Photos ou description ne correspondant pas au terrain reellement visite",
      statut: StatutSignalement.DEPOSE,
      signalantId: acheteur1.id,
    },
    {
      type: TypeSignalement.LITIGE_FONCIER,
      parcelleId: parcelleFamiliale,
      motif: "Un membre de la famille conteste la representation du mandataire aine",
      descriptif: "Demande de verification du mandat avant toute signature complementaire.",
      statut: StatutSignalement.DEPOSE,
      signalantId: mandataireAineUtilisateur.id,
    },
    {
      type: TypeSignalement.LITIGE_FONCIER,
      parcelleId: cotonouTitree,
      motif: "Doute sur l'authenticite du titre presente lors d'une negociation informelle",
      statut: StatutSignalement.REJETE,
      signalantId: citoyen1.id,
      qualifieParId: admin.id,
      decisionMotif: "Titre verifie aupres du registre : authentique, aucune anomalie constatee.",
    },
    {
      type: TypeSignalement.ANNONCE,
      parcelleId: annoncesActives[5] ? annoncesBulk[5]!.parcelleId : parcelleLokossa.id,
      annonceId: annoncesActives[5]?.id,
      motif: "Vendeur injoignable depuis plusieurs jours apres manifestation d'interet",
      statut: StatutSignalement.DEPOSE,
      signalantId: acheteur2.id,
    },
    {
      type: TypeSignalement.LITIGE_FONCIER,
      parcelleId: parcelleLitige,
      motif: "Confirmation d'un second acquereur ayant egalement recu une convention signee",
      descriptif: "Vient corroborer le dossier CSAF-2026-000042 deja ouvert.",
      statut: StatutSignalement.FONDE,
      signalantId: citoyen1.id,
      qualifieParId: admin.id,
      decisionMotif: "Confirme le double engagement deja identifie par la CSAF.",
    },
  ];
  for (const s of signalements) {
    await prisma.signalement.create({
      data: {
        type: s.type,
        parcelleId: s.parcelleId,
        annonceId: s.annonceId,
        motif: s.motif,
        descriptif: s.descriptif,
        statut: s.statut,
        signalantId: s.signalantId,
        qualifieParId: s.qualifieParId,
        decisionMotif: s.decisionMotif,
        traiteLe: s.qualifieParId ? new Date() : null,
      },
    });
  }

  console.log("Identification des batis de demonstration (import IA + saisie manuelle)...");
  // Detecte par IA (type Google Open Buildings) sur une parcelle en vitrine, pas encore valide.
  await insererBati([2.3945, 6.3688], SourceBati.IMPORT_IA, { parcelleId: parcelleVendeur, scoreConfiance: 0.91 });
  // Dessine directement par un geometre sur la carte : valide d'emblee.
  await insererBati([1.7167, 6.6389], SourceBati.SAISIE_MANUELLE, {
    parcelleId: parcelleLokossa.id,
    valide: true,
    valideParId: geometre1.id,
  });
  // Detection IA isolee, ne recoupant aucune parcelle cadastree connue (cas frequent en pratique).
  await insererBati([1.3816, 10.3062], SourceBati.IMPORT_IA, { scoreConfiance: 0.62 });
  // Volume supplementaire de batis IA en attente de validation, repartis sur plusieurs communes.
  for (const [i, p] of parcellesBulk.filter((p) => p.proprietaireId && p.proprietaireId !== etat.id).slice(17, 24).entries()) {
    const centreCommune = COMMUNES.find((c) => c.commune === p.commune)!.centre;
    await insererBati([centreCommune[0] + i * 0.0004, centreCommune[1] + i * 0.0003], SourceBati.IMPORT_IA, {
      parcelleId: p.id,
      scoreConfiance: 0.55 + (i % 4) * 0.1,
      valide: i % 4 === 0,
      valideParId: i % 4 === 0 ? geometre2.id : undefined,
    });
  }

  console.log("Occupation du sol indicative (calque satellite type ESA WorldCover)...");
  // Zone agricole recoupant la parcelle de Lokossa, deja decrite comme terrain agricole dans son annonce.
  await insererZoneOccupationSol([1.7167, 6.6389], TypeUsageSol.AGRICOLE);
  await prisma.parcelle.update({ where: { id: parcelleLokossa.id }, data: { usageSolIndicatif: TypeUsageSol.AGRICOLE } });
  // Zone urbaine recoupant la parcelle vendeur de Cotonou, encore en attente de confirmation ANDF.
  await insererZoneOccupationSol([2.3945, 6.3688], TypeUsageSol.URBAIN);
  await prisma.parcelle.update({ where: { id: parcelleVendeur }, data: { usageSolIndicatif: TypeUsageSol.URBAIN } });
  // Parcelle dont l'usage indicatif a deja ete confirme par un agent ANDF (etat final du workflow).
  await prisma.parcelle.update({
    where: { id: parcelleVenteHistorique },
    data: { usageSolIndicatif: TypeUsageSol.URBAIN, usageSolValide: TypeUsageSol.URBAIN, usageSolValideParId: andfLittoral.id },
  });
  // Quelques zones supplementaires (foret, eau, agricole) sur des communes variees, pour que la
  // console "Usage du sol" du back-office ait plusieurs dossiers a traiter.
  const typesUsageBulk = [TypeUsageSol.AGRICOLE, TypeUsageSol.FORET, TypeUsageSol.EAU, TypeUsageSol.AGRICOLE, TypeUsageSol.URBAIN];
  for (const [i, p] of parcellesBulk.filter((p) => p.proprietaireId && p.proprietaireId !== etat.id).slice(24, 29).entries()) {
    const centreCommune = COMMUNES.find((c) => c.commune === p.commune)!.centre;
    await insererZoneOccupationSol(centreCommune, typesUsageBulk[i % typesUsageBulk.length]!, 0.003);
    await prisma.parcelle.update({ where: { id: p.id }, data: { usageSolIndicatif: typesUsageBulk[i % typesUsageBulk.length]! } });
  }

  console.log("Cree :");
  console.log(`  - Parcelle titree prete pour le scenario 'import de bornage en chevauchement' : ${cotonouTitree}`);
  console.log(`  - Parcelle sous gel CSAF (rouge) : ${parcelleLitige}`);
  console.log(`  - Parcelle familiale en attente de multi-signature : ${parcelleFamiliale}`);
  console.log(`  - ${parcellesBulk.length + 3} parcelles supplementaires reparties sur ${COMMUNES.length} communes`);
  console.log(`  - ${annoncesBulk.length} annonces au total (dont ${annoncesActives.length} actives)`);
  void parcelleKodjoSupp1;
  void parcelleKodjoSupp2;
  void parcelleAkouaviSupp;
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
