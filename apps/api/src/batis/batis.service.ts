import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { RoleUtilisateur, SourceBati, TypeOperationAudit, type CreationBatiDto, type ValidationBatiDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

export interface BatiAvecGeometrie {
  id: string;
  source: string;
  scoreConfiance: number | null;
  parcelleId: string | null;
  valide: boolean;
  geometrie: GeoJSON.Polygon;
}

const SELECT_BATI = Prisma.sql`
  SELECT b.id, b.source, b."scoreConfiance"::float AS "scoreConfiance", b."parcelleId", b.valide,
         ST_AsGeoJSON(b.geom)::json AS geometrie
  FROM "Bati" b
`;

@Injectable()
export class BatisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  /** Vue d'ensemble pour affichage carte (comme ParcellesService.listerToutes()). */
  async listerToutes(): Promise<BatiAvecGeometrie[]> {
    return this.prisma.$queryRaw<BatiAvecGeometrie[]>(Prisma.sql`${SELECT_BATI} ORDER BY b."createdAt" DESC`);
  }

  async listerParParcelle(parcelleId: string): Promise<BatiAvecGeometrie[]> {
    return this.prisma.$queryRaw<BatiAvecGeometrie[]>(Prisma.sql`${SELECT_BATI} WHERE b."parcelleId" = ${parcelleId}`);
  }

  /** File d'attente des batis detectes par IA restant a valider par un geometre/agent. */
  async listerAValider(): Promise<BatiAvecGeometrie[]> {
    return this.prisma.$queryRaw<BatiAvecGeometrie[]>(
      Prisma.sql`${SELECT_BATI} WHERE b.valide = false ORDER BY b."createdAt" ASC`,
    );
  }

  /** Saisie manuelle d'un bati par un geometre/agent (source SAISIE_MANUELLE, valide d'emblee). */
  async creer(dto: CreationBatiDto, utilisateur: UtilisateurAuthentifie): Promise<{ id: string }> {
    const id = randomUUID();
    const geometrieJson = JSON.stringify(dto.geometrie);

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Bati" (id, geom, source, "parcelleId", valide, "valideParId", "createdAt", "updatedAt")
      VALUES (
        ${id},
        ST_SetSRID(ST_GeomFromGeoJSON(${geometrieJson}), 4326),
        ${SourceBati.SAISIE_MANUELLE}::"SourceBati",
        ${dto.parcelleId ?? null},
        true,
        ${utilisateur.id},
        now(), now()
      )
    `);

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.VALIDATION_BATI,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { batiId: id, source: SourceBati.SAISIE_MANUELLE },
    });

    return { id };
  }

  /** Valide (et corrige eventuellement) un bati importe par detection IA. */
  async valider(id: string, dto: ValidationBatiDto, utilisateur: UtilisateurAuthentifie): Promise<BatiAvecGeometrie> {
    const bati = await this.prisma.bati.findUnique({ where: { id } });
    if (!bati) {
      throw new NotFoundException("Bati introuvable");
    }

    if (dto.geometrie) {
      const geometrieJson = JSON.stringify(dto.geometrie);
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE "Bati" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${geometrieJson}), 4326), "updatedAt" = now()
        WHERE id = ${id}
      `);
    }
    if (dto.parcelleId !== undefined) {
      await this.prisma.bati.update({ where: { id }, data: { parcelleId: dto.parcelleId } });
    }
    await this.prisma.bati.update({
      where: { id },
      data: { valide: true, valideParId: utilisateur.id },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId ?? bati.parcelleId ?? undefined,
      typeOperation: TypeOperationAudit.VALIDATION_BATI,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { batiId: id, corrige: Boolean(dto.geometrie || dto.parcelleId !== undefined) },
    });

    const [misAJour] = await this.prisma.$queryRaw<BatiAvecGeometrie[]>(Prisma.sql`${SELECT_BATI} WHERE b.id = ${id}`);
    if (!misAJour) {
      throw new NotFoundException("Bati introuvable");
    }
    return misAJour;
  }

  /** Rejette un bati detecte par IA (faux positif) : jamais un bati saisi manuellement. */
  async rejeter(id: string, utilisateur: UtilisateurAuthentifie): Promise<void> {
    const bati = await this.prisma.bati.findUnique({ where: { id } });
    if (!bati) {
      throw new NotFoundException("Bati introuvable");
    }
    if (bati.source === SourceBati.SAISIE_MANUELLE) {
      throw new ForbiddenException("Un bati saisi manuellement ne peut pas etre rejete comme faux positif");
    }

    await this.prisma.bati.delete({ where: { id } });

    await this.cryptoAudit.enregistrer({
      parcelleId: bati.parcelleId ?? undefined,
      typeOperation: TypeOperationAudit.REJET_BATI,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { batiId: id, scoreConfiance: bati.scoreConfiance },
    });
  }
}
