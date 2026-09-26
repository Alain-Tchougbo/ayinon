/* eslint-disable no-console */
/**
 * Import ponctuel de batis detectes par IA (ex. Google Open Buildings) a partir d'extraits GeoJSON
 * prepares hors de cette application (le telechargement des donnees satellite se fait via le
 * portail Google ou l'outil CLI `get_buildings`, pas depuis ce script). Chaque bati importe reste
 * `valide: false` (voir SourceBati.IMPORT_IA) tant qu'un geometre/agent ne l'a pas confirme via
 * PATCH /batis/:id/valider (voir apps/web/src/views/geometre/ValidationBatisView.vue).
 *
 * Usage : deposer un ou plusieurs fichiers .geojson (FeatureCollection de Polygon, propriete
 * "confidence" optionnelle) dans apps/api/prisma/data/batis/, puis `pnpm --filter api run import:batis`.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SourceBati } from "@ayinon/shared";

const prisma = new PrismaClient();
const DOSSIER_DONNEES = join(__dirname, "..", "prisma", "data", "batis");

interface FeatureBati {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties?: Record<string, unknown>;
}
interface FeatureCollectionBatis {
  type: "FeatureCollection";
  features: FeatureBati[];
}

async function importerFichier(cheminFichier: string): Promise<number> {
  const contenu = JSON.parse(readFileSync(cheminFichier, "utf-8")) as FeatureCollectionBatis;
  let nombreImportes = 0;

  for (const feature of contenu.features) {
    if (feature.geometry.type !== "Polygon") {
      console.warn(`  - Ignore (geometrie ${feature.geometry.type}, seuls les Polygon sont supportes)`);
      continue;
    }
    const scoreConfiance = typeof feature.properties?.confidence === "number" ? feature.properties.confidence : null;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Bati" (id, geom, source, "scoreConfiance", valide, "createdAt", "updatedAt")
      VALUES (
        ${randomUUID()},
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326),
        ${SourceBati.IMPORT_IA}::"SourceBati",
        ${scoreConfiance},
        false,
        now(), now()
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
    console.error("Deposez-y vos extraits GeoJSON (Google Open Buildings ou equivalent) avant de relancer ce script.");
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
  console.log(`${total} bati(s) importe(s) (non valides, source IMPORT_IA).`);

  console.log("Recoupement spatial avec les parcelles cadastrees connues...");
  const count = await prisma.$executeRaw(Prisma.sql`
    UPDATE "Bati" b
    SET "parcelleId" = p.id
    FROM "Parcelle" p
    WHERE b."parcelleId" IS NULL AND ST_Intersects(b.geom, p.geom)
  `);
  console.log(`${count} bati(s) rattache(s) a une parcelle existante.`);
}

main()
  .catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
