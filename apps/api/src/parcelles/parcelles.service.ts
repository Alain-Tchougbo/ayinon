import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RoleUtilisateur, TypeOperationAudit, type RechercheParcelleDto, type SimulationFraisDto } from "@ayinon/shared";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";

const CONTEXTE_OTP_VERROU = "VERROU_PARCELLE";
const RAYON_RECHERCHE_GPS_METRES = 500;

export interface ParcelleAvecGeometrie {
  id: string;
  nup: string;
  superficieM2: number;
  statut: string;
  poleTerritorial: string;
  commune: string;
  arrondissement: string | null;
  verrouAntiVente: boolean;
  geometrie: GeoJSON.Polygon;
  proprietaireId: string | null;
  proprietaireNom: string | null;
}

@Injectable()
export class ParcellesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
    private readonly otp: OtpService,
  ) {}

  /** Vue d'ensemble cadastrale pour la carte (code couleur par statut). */
  async listerToutes(): Promise<ParcelleAvecGeometrie[]> {
    return this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
      SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
             p.commune, p.arrondissement, p."verrouAntiVente",
             ST_AsGeoJSON(p.geom)::json AS geometrie,
             pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
      FROM "Parcelle" p
      LEFT JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
      ORDER BY p."createdAt" DESC
    `);
  }

  /** Delta pour la synchronisation offline : parcelles modifiees depuis le dernier passage du client. */
  async listerModifieesDepuis(depuis: Date): Promise<ParcelleAvecGeometrie[]> {
    return this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
      SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
             p.commune, p.arrondissement, p."verrouAntiVente",
             ST_AsGeoJSON(p.geom)::json AS geometrie,
             pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
      FROM "Parcelle" p
      LEFT JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
      WHERE p."updatedAt" >= ${depuis}
      ORDER BY p."updatedAt" ASC
    `);
  }

  async obtenirParId(id: string): Promise<ParcelleAvecGeometrie> {
    const [parcelle] = await this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
      SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
             p.commune, p.arrondissement, p."verrouAntiVente",
             ST_AsGeoJSON(p.geom)::json AS geometrie,
             pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
      FROM "Parcelle" p
      LEFT JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
      WHERE p.id = ${id}
    `);
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    return parcelle;
  }

  async rechercher(dto: RechercheParcelleDto): Promise<ParcelleAvecGeometrie[]> {
    if (dto.nup) {
      return this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
        SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
               p.commune, p.arrondissement, p."verrouAntiVente",
               ST_AsGeoJSON(p.geom)::json AS geometrie,
               pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
        FROM "Parcelle" p
        LEFT JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
        WHERE p.nup ILIKE ${`%${dto.nup}%`}
        LIMIT 25
      `);
    }

    if (dto.nomProprietaire) {
      return this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
        SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
               p.commune, p.arrondissement, p."verrouAntiVente",
               ST_AsGeoJSON(p.geom)::json AS geometrie,
               pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
        FROM "Parcelle" p
        JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
        WHERE pr."nomComplet" ILIKE ${`%${dto.nomProprietaire}%`}
        LIMIT 25
      `);
    }

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      return this.prisma.$queryRaw<ParcelleAvecGeometrie[]>(Prisma.sql`
        SELECT p.id, p.nup, p."superficieM2"::float AS "superficieM2", p.statut, p."poleTerritorial",
               p.commune, p.arrondissement, p."verrouAntiVente",
               ST_AsGeoJSON(p.geom)::json AS geometrie,
               pr.id AS "proprietaireId", pr."nomComplet" AS "proprietaireNom"
        FROM "Parcelle" p
        LEFT JOIN "Proprietaire" pr ON pr.id = p."proprietaireId"
        WHERE ST_DWithin(
          p.geom::geography,
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
          ${RAYON_RECHERCHE_GPS_METRES}
        )
        ORDER BY ST_Distance(
          p.geom::geography,
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography
        )
        LIMIT 25
      `);
    }

    throw new BadRequestException("Critere de recherche manquant");
  }

  async demanderOtpVerrou(utilisateur: UtilisateurAuthentifie) {
    const code = await this.otp.genererCode(utilisateur.id, CONTEXTE_OTP_VERROU);
    return {
      message: "Code envoye (SMS/WhatsApp en production)",
      codeDebug: process.env.NODE_ENV === "production" ? undefined : code,
    };
  }

  /** Passeport foncier : seul le proprietaire enregistre peut verrouiller/deverrouiller sa parcelle. */
  async definirVerrouAntiVente(
    parcelleId: string,
    verrouille: boolean,
    codeOtp: string,
    utilisateur: UtilisateurAuthentifie,
  ) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    if (!utilisateur.proprietaireId || parcelle.proprietaireId !== utilisateur.proprietaireId) {
      throw new ForbiddenException("Seul le proprietaire enregistre peut modifier le verrou anti-vente");
    }

    const codeValide = await this.otp.verifierCode(utilisateur.id, CONTEXTE_OTP_VERROU, codeOtp);
    if (!codeValide) {
      throw new BadRequestException("Code de confirmation invalide ou expire");
    }

    const misAJour = await this.prisma.parcelle.update({
      where: { id: parcelleId },
      data: { verrouAntiVente: verrouille },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId,
      typeOperation: verrouille
        ? TypeOperationAudit.VERROUILLAGE_ANTI_VENTE
        : TypeOperationAudit.DEVERROUILLAGE_ANTI_VENTE,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { nup: parcelle.nup, verrouille },
    });

    return misAJour;
  }

  /**
   * Simulateur transparent des frais de mutation. Bareme indicatif et parametrable — a aligner
   * avec le bareme DGI (droits d'enregistrement) et la Taxe Fonciere Unique (TFU) en vigueur.
   */
  simulerFrais(dto: SimulationFraisDto) {
    const TAUX_DROITS_ENREGISTREMENT = 0.08;
    const TAUX_EMOLUMENTS_TRANCHE_1 = 0.03;
    const SEUIL_TRANCHE_1_FCFA = 5_000_000;
    const TAUX_EMOLUMENTS_TRANCHE_2 = 0.015;
    const TARIF_TFU_URBAIN_FCFA_M2 = 5;
    const TARIF_TFU_RURAL_FCFA_M2 = 2;

    const droitsEnregistrementFcfa = Math.round(dto.valeurDeclareeFcfa * TAUX_DROITS_ENREGISTREMENT);

    const baseTranche1 = Math.min(dto.valeurDeclareeFcfa, SEUIL_TRANCHE_1_FCFA);
    const baseTranche2 = Math.max(0, dto.valeurDeclareeFcfa - SEUIL_TRANCHE_1_FCFA);
    const emolumentsNotariauxFcfa = Math.round(
      baseTranche1 * TAUX_EMOLUMENTS_TRANCHE_1 + baseTranche2 * TAUX_EMOLUMENTS_TRANCHE_2,
    );

    const tarifTfu = dto.enZoneUrbaine ? TARIF_TFU_URBAIN_FCFA_M2 : TARIF_TFU_RURAL_FCFA_M2;
    const taxeFonciereUniqueAnnuelleFcfa = Math.round(dto.superficieM2 * tarifTfu);

    const totalFcfa = droitsEnregistrementFcfa + emolumentsNotariauxFcfa + taxeFonciereUniqueAnnuelleFcfa;

    return {
      droitsEnregistrementFcfa,
      emolumentsNotariauxFcfa,
      taxeFonciereUniqueAnnuelleFcfa,
      totalFcfa,
      avertissement:
        "Simulation indicative destinee a eliminer les rackets des demarcheurs informels (kpatchi-kpatchi) — " +
        "le montant definitif est etabli par le notaire et les services de la DGI.",
    };
  }
}
