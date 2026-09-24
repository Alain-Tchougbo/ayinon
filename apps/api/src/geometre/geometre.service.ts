import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  RoleUtilisateur,
  TypeOperationAudit,
  type GeoJsonPolygon,
  type ImportBornageDto,
  type SignaturePlanBornageDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

interface ParcelleEnConflit {
  id: string;
  nup: string;
  aireIntersectionM2: number;
}

@Injectable()
export class GeometreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  /**
   * Televerse un plan de bornage et calcule automatiquement, via PostGIS, les intersections
   * avec les parcelles mitoyennes deja enregistrees (ST_Intersects / ST_Area). Le plan est
   * marque chevauchementDetecte s'il empiete sur une parcelle voisine ; il ne pourra alors
   * pas etre signe tant que le conflit n'est pas resolu (voir signerPlan).
   */
  async importerBornage(dto: ImportBornageDto): Promise<{
    planBornageId: string;
    chevauchementDetecte: boolean;
    parcellesEnConflit: ParcelleEnConflit[];
  }> {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }

    const conflits = await this.detecterChevauchement(dto.geometrie, dto.parcelleId);
    const chevauchementDetecte = conflits.length > 0;
    const hashSha256 = this.cryptoAudit.hashPayload({
      parcelleId: dto.parcelleId,
      geometrie: dto.geometrie,
      referenceDossier: dto.referenceDossier,
    });

    const id = randomUUID();
    const geometrieJson = JSON.stringify(dto.geometrie);
    const parcellesEnConflitLiteral = `{${conflits.map((c) => `"${c.id}"`).join(",")}}`;

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PlanBornage"
        (id, "parcelleId", geometrie, "referenceDossier", "chevauchementDetecte", "parcellesEnConflit", "hashSha256", "createdAt")
      VALUES (
        ${id},
        ${dto.parcelleId},
        ST_SetSRID(ST_GeomFromGeoJSON(${geometrieJson}), 4326),
        ${dto.referenceDossier},
        ${chevauchementDetecte},
        ${parcellesEnConflitLiteral}::text[],
        ${hashSha256},
        now()
      )
    `);

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.IMPORT_BORNAGE,
      payload: { planBornageId: id, referenceDossier: dto.referenceDossier, hashSha256 },
    });

    if (chevauchementDetecte) {
      await this.cryptoAudit.enregistrer({
        parcelleId: dto.parcelleId,
        typeOperation: TypeOperationAudit.DETECTION_CHEVAUCHEMENT,
        payload: { planBornageId: id, parcellesEnConflit: conflits.map((c) => c.id) },
      });
    }

    return { planBornageId: id, chevauchementDetecte, parcellesEnConflit: conflits };
  }

  /** Le plan ne peut etre scelle par le geometre-expert que si aucun chevauchement n'est en cours. */
  async signerPlan(dto: SignaturePlanBornageDto, utilisateur: UtilisateurAuthentifie) {
    const plan = await this.prisma.planBornage.findUnique({ where: { id: dto.planBornageId } });
    if (!plan) {
      throw new NotFoundException("Plan de bornage introuvable");
    }
    if (plan.chevauchementDetecte) {
      throw new BadRequestException(
        "Signature refusee : ce plan presente un chevauchement geometrique non resolu avec une parcelle mitoyenne",
      );
    }
    if (plan.signeParId) {
      throw new ForbiddenException("Ce plan de bornage est deja signe");
    }

    const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(plan.hashSha256, "hex"));

    const planSigne = await this.prisma.planBornage.update({
      where: { id: dto.planBornageId },
      data: {
        signeParId: utilisateur.id,
        numeroOrdreOgeb: dto.numeroOrdreOgeb,
        signatureEd25519,
      },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: plan.parcelleId,
      typeOperation: TypeOperationAudit.SIGNATURE_PLAN_BORNAGE,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { planBornageId: plan.id, numeroOrdreOgeb: dto.numeroOrdreOgeb },
    });

    return planSigne;
  }

  async listerParParcelle(parcelleId: string) {
    return this.prisma.planBornage.findMany({
      where: { parcelleId },
      select: {
        id: true,
        referenceDossier: true,
        chevauchementDetecte: true,
        parcellesEnConflit: true,
        numeroOrdreOgeb: true,
        hashSha256: true,
        signatureEd25519: true,
        signeParId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async detecterChevauchement(geometrie: GeoJsonPolygon, parcelleIdExclue: string): Promise<ParcelleEnConflit[]> {
    const geometrieJson = JSON.stringify(geometrie);
    return this.prisma.$queryRaw<ParcelleEnConflit[]>(Prisma.sql`
      SELECT p.id, p.nup,
             ST_Area(ST_Intersection(p.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geometrieJson}), 4326))::geography) AS "aireIntersectionM2"
      FROM "Parcelle" p
      WHERE p.id != ${parcelleIdExclue}
        AND ST_Intersects(p.geom, ST_SetSRID(ST_GeomFromGeoJSON(${geometrieJson}), 4326))
    `);
  }
}
