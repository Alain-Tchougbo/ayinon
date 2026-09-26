/* eslint-disable no-console */
/**
 * Import ponctuel d'un calque d'occupation du sol (type ESA WorldCover, classe "Cropland") a
 * partir de polygones GeoJSON deja pre-vectorises hors de cette application (WorldCover est
 * distribue en GeoTIFF raster ; la vectorisation se fait via Google Earth Engine ou QGIS avant
 * d'arriver ici — voir le plan pour la justification de ce choix, coherent avec l'usage exclusivement
 * vecteur du reste du projet, aucune extension raster PostGIS).
 *
 * Chaque feature peut porter une propriete "typeUsage" (AGRICOLE|URBAIN|FORET|EAU|AUTRE) ; a
 * defaut, AGRICOLE est suppose (cas d'usage principal : la classe Cropland d'ESA WorldCover).
 * Ce calque reste purement indicatif (Parcelle.usageSolIndicatif) : jamais ecrit dans
 * usageSolValide, reserve a la confirmation humaine d'un agent ANDF (voir
 * apps/web/src/views/andf/ValidationUsageSolView.vue).
 *
 * Usage : deposer un ou plusieurs fichiers .geojson dans apps/api/prisma/data/zonage/, puis
 * `pnpm --filter api run import:zonage`.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TypeUsageSol } from "@ayinon/shared";

const prisma = new PrismaClient();
const DOSSIER_DONNEES = join(__dirname, "..", "prisma", "data", "zonage");
const TYPES_USAGE_VALIDES = new Set<string>(Object.values(TypeUsageSol));

interface FeatureZone {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties?: Record<string, unknown>;
}
interface FeatureCollectionZones {
  type: "FeatureCollection";
  features: FeatureZone[];
}

async function importerFichier(cheminFichier: string): Promise<number> {
  const contenu = JSON.parse(readFileSync(cheminFichier, "utf-8")) as FeatureCollectionZones;
  let nombreImportes = 0;

  for (const feature of contenu.features) {
    if (feature.geometry.type !== "Polygon") {
      console.warn(`  - Ignore (geometrie ${feature.geometry.type}, seuls les Polygon sont supportes)`);
      continue;
    }
    const typeUsageBrut = feature.properties?.typeUsage;
    const typeUsage = typeof typeUsageBrut === "string" && TYPES_USAGE_VALIDES.has(typeUsageBrut) ? typeUsageBrut : TypeUsageSol.AGRICOLE;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ZoneOccupationSol" (id, geom, "typeUsage", source, "createdAt")
      VALUES (
        ${randomUUID()},
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326),
        ${typeUsage}::"TypeUsageSol",
        'ESA_WORLDCOVER_2021',
        now()
      )
    `);
    nombreImportes++;
  }
  return nombreImportes;
}

async function main() {
  let fichiers: string[] = [];
  try {
    fichiers = readdirSync(DOSSIER_DONNEES).filter((f) => f.endsWith(".geojson"));
  } catch {
    console.error(`Dossier introuvable : ${DOSSIER_DONNEES}`);
    console.error("Deposez-y vos polygones de zonage pre-vectorises avant de relancer ce script.");
    process.exitCode = 1;
    return;
  }

  if (fichiers.length === 0) {
    console.log(`Aucun fichier .geojson dans ${DOSSIER_DONNEES} — rien a importer.`);
    return;
  }

  let total = 0;
  for (const fichier of fichiers) {
    console.log(`Import de ${fichier}...`);
    total += await importerFichier(join(DOSSIER_DONNEES, fichier));
  }
  console.log(`${total} zone(s) d'occupation du sol importee(s).`);

  console.log("Calcul de l'usage du sol indicatif dominant par parcelle (recoupement spatial)...");
  const count = await prisma.$executeRaw(Prisma.sql`
    WITH aires AS (
      SELECT p.id AS "parcelleId", z."typeUsage",
             SUM(ST_Area(ST_Intersection(p.geom, z.geom)::geography)) AS aire
      FROM "Parcelle" p
      JOIN "ZoneOccupationSol" z ON ST_Intersects(p.geom, z.geom)
      GROUP BY p.id, z."typeUsage"
    ),
    dominant AS (
      SELECT DISTINCT ON ("parcelleId") "parcelleId", "typeUsage"
      FROM aires
      ORDER BY "parcelleId", aire DESC
    )
    UPDATE "Parcelle" p
    SET "usageSolIndicatif" = d."typeUsage"
    FROM dominant d
    WHERE p.id = d."parcelleId"
  `);
  console.log(`${count} parcelle(s) mise(s) a jour (usageSolIndicatif) — usageSolValide n'est jamais touche par ce script.`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
