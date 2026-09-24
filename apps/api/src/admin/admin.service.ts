import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleUtilisateur, TypeOperationAudit, type ModifierParcelleAdminDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Back-office minimal : vue d'ensemble et gestion de contenu de base (utilisateurs, proprietaires,
 * parcelles, documents) pour le role ADMIN. Volontairement en lecture seule sauf pour les champs
 * declaratifs d'une parcelle (commune/arrondissement) : le statut cadastral, lui, reste pilote
 * exclusivement par les workflows metier dedies (cession, gel CSAF, import geometre) pour ne jamais
 * court-circuiter leurs garde-fous depuis un simple formulaire d'admin.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async vueEnsemble() {
    const [utilisateursParRole, parcellesParStatut, totalConventions, totalTitres, hypothequesActives, totalProprietaires] = await Promise.all([
      this.prisma.utilisateur.groupBy({ by: ["role"], _count: true }),
      this.prisma.parcelle.groupBy({ by: ["statut"], _count: true }),
      this.prisma.convention.count(),
      this.prisma.titre.count(),
      this.prisma.hypotheque.count({ where: { statut: "ACTIVE" } }),
      this.prisma.proprietaire.count(),
    ]);

    return {
      utilisateursParRole: utilisateursParRole.map((u) => ({ role: u.role, total: u._count })),
      parcellesParStatut: parcellesParStatut.map((p) => ({ statut: p.statut, total: p._count })),
      totalConventions,
      totalTitres,
      hypothequesActives,
      totalProprietaires,
    };
  }

  async listerUtilisateurs() {
    return this.prisma.utilisateur.findMany({
      select: { id: true, email: true, role: true, nomComplet: true, telephone: true, poleTerritorial: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listerProprietaires() {
    const proprietaires = await this.prisma.proprietaire.findMany({
      select: {
        id: true,
        nomComplet: true,
        email: true,
        telephone: true,
        estDiaspora: true,
        paysResidence: true,
        _count: { select: { parcelles: true } },
      },
      orderBy: { nomComplet: "asc" },
    });
    return proprietaires.map(({ _count, ...p }) => ({ ...p, nombreParcelles: _count.parcelles }));
  }

  async listerDocuments() {
    const [conventions, titres] = await Promise.all([
      this.prisma.convention.findMany({
        select: { id: true, vendeurNom: true, acquereurNom: true, montantFcfa: true, statutCession: true, createdAt: true, parcelle: { select: { nup: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.titre.findMany({
        select: { id: true, numeroTitre: true, dateDelivrance: true, parcelle: { select: { nup: true } } },
        orderBy: { dateDelivrance: "desc" },
        take: 50,
      }),
    ]);
    return { conventions, titres };
  }

  async listerParcelles() {
    return this.prisma.parcelle.findMany({
      select: {
        id: true,
        nup: true,
        commune: true,
        arrondissement: true,
        statut: true,
        superficieM2: true,
        poleTerritorial: true,
        proprietaire: { select: { nomComplet: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async modifierParcelle(id: string, dto: ModifierParcelleAdminDto, admin: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }

    const misAJour = await this.prisma.parcelle.update({ where: { id }, data: dto });

    await this.cryptoAudit.enregistrer({
      parcelleId: id,
      typeOperation: TypeOperationAudit.MODIFICATION_ADMIN_PARCELLE,
      acteurId: admin.id,
      roleActeur: admin.role as RoleUtilisateur,
      payload: { champsModifies: dto },
    });

    return misAJour;
  }
}
