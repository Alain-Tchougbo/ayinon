import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  RoleUtilisateur,
  StatutAnnonce,
  StatutCession,
  StatutValidationPro,
  TypeOperationAudit,
  type ModifierParcelleAdminDto,
  type SuspendreAnnonceDto,
  type TraiterDemandeProDto,
} from "@ayinon/shared";
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
  /** Ecart de prix/m² juge suspect par rapport a la moyenne communale (indicatif, comme le
   * simulateur de gain net et l'estimation de prix ailleurs sur la plateforme). */
  private readonly SEUIL_DEVIATION_PRIX = 0.5;
  /** Meme seuil que l'estimation de prix (E1.9) pour juger une moyenne communale fiable. */
  private readonly MIN_REFERENCES_FIABLES = 3;

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

  /** E3.9 : detection de comptes potentiellement lies. Seul le critere "meme numero de telephone
   * sur plusieurs comptes" est verifiable ici : `telephone` n'est pas contraint unique (a la
   * difference de `email`), donc un meme numero peut legitimement se retrouver sur plusieurs
   * comptes sans qu'aucune regle metier ne l'empeche aujourd'hui. Purement une liste a revoir,
   * en lecture seule : aucune action de fusion/suspension de compte n'existe sur la plateforme,
   * pour aucun role, pas seulement ici (voir docs/decisions.md). */
  async comptesLiesParTelephone() {
    const comptes = await this.prisma.utilisateur.findMany({
      where: { telephone: { not: null } },
      select: { id: true, email: true, nomComplet: true, role: true, telephone: true, createdAt: true },
      orderBy: { telephone: "asc" },
    });

    const groupes = new Map<string, typeof comptes>();
    for (const compte of comptes) {
      const groupe = groupes.get(compte.telephone!) ?? [];
      groupe.push(compte);
      groupes.set(compte.telephone!, groupe);
    }
    return [...groupes.entries()].filter(([, comptesLies]) => comptesLies.length > 1).map(([telephone, comptesLies]) => ({ telephone, comptes: comptesLies }));
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

  /** E0.6 : file d'attente des demandes de compte professionnel (E0.5) en attente de validation. */
  async demandesProfessionnellesEnAttente() {
    return this.prisma.utilisateur.findMany({
      where: { statutValidationPro: StatutValidationPro.EN_ATTENTE },
      select: { id: true, email: true, nomComplet: true, telephone: true, role: true, numeroAgrement: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async traiterDemandePro(id: string, dto: TraiterDemandeProDto, admin: UtilisateurAuthentifie) {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!utilisateur) {
      throw new NotFoundException("Compte introuvable");
    }
    if (utilisateur.statutValidationPro !== StatutValidationPro.EN_ATTENTE) {
      throw new BadRequestException("Cette demande a deja ete traitee");
    }
    if (!dto.approuver && !dto.motifRejet) {
      throw new BadRequestException("Un motif est requis pour rejeter une demande de compte professionnel");
    }

    const misAJour = await this.prisma.utilisateur.update({
      where: { id },
      data: {
        statutValidationPro: dto.approuver ? StatutValidationPro.APPROUVE : StatutValidationPro.REJETE,
        motifRejetPro: dto.approuver ? null : dto.motifRejet,
        valideParId: admin.id,
      },
      select: { id: true, email: true, nomComplet: true, role: true, statutValidationPro: true },
    });

    await this.cryptoAudit.enregistrer({
      typeOperation: dto.approuver ? TypeOperationAudit.VALIDATION_COMPTE_PRO : TypeOperationAudit.REJET_COMPTE_PRO,
      acteurId: admin.id,
      roleActeur: admin.role as RoleUtilisateur,
      payload: { compteId: id, motifRejet: dto.motifRejet ?? null },
    });

    return misAJour;
  }

  /** E1.14 : detection automatique d'annonces a risque. Seul le critere "prix aberrant" est
   * implementable honnetement dans cette iteration : les doublons sont deja impossibles par
   * construction (une seule annonce active par parcelle, voir AnnoncesService.creer) et
   * l'annonce ne porte aucune photo dans ce modele de donnees (rien a analyser). */
  async annoncesARisque() {
    const annoncesActives = await this.prisma.annonce.findMany({
      where: { statut: StatutAnnonce.ACTIVE, prixIndicatifFcfa: { not: null } },
      select: {
        id: true,
        prixIndicatifFcfa: true,
        createdAt: true,
        parcelle: { select: { nup: true, commune: true, superficieM2: true } },
        publieePar: { select: { nomComplet: true } },
      },
    });

    const communes = [...new Set(annoncesActives.map((a) => a.parcelle.commune))];
    const moyennesParCommune = new Map<string, number>();
    await Promise.all(
      communes.map(async (commune) => {
        const references = await this.prisma.convention.findMany({
          where: { statutCession: StatutCession.VALIDEE, parcelle: { commune } },
          select: { montantFcfa: true, parcelle: { select: { superficieM2: true } } },
        });
        if (references.length < this.MIN_REFERENCES_FIABLES) {
          return;
        }
        const moyenne = references.reduce((somme, r) => somme + r.montantFcfa / r.parcelle.superficieM2, 0) / references.length;
        moyennesParCommune.set(commune, moyenne);
      }),
    );

    return annoncesActives
      .map((annonce) => {
        const moyenneCommune = moyennesParCommune.get(annonce.parcelle.commune);
        if (!moyenneCommune) {
          return null;
        }
        const prixParM2 = annonce.prixIndicatifFcfa! / annonce.parcelle.superficieM2;
        const deviation = (prixParM2 - moyenneCommune) / moyenneCommune;
        if (Math.abs(deviation) < this.SEUIL_DEVIATION_PRIX) {
          return null;
        }
        return {
          id: annonce.id,
          parcelle: annonce.parcelle,
          publieePar: annonce.publieePar,
          prixIndicatifFcfa: annonce.prixIndicatifFcfa,
          prixParM2: Math.round(prixParM2),
          moyenneCommuneFcfaParM2: Math.round(moyenneCommune),
          deviationPourcentage: Math.round(deviation * 100),
          createdAt: annonce.createdAt,
        };
      })
      .filter((annonce): annonce is NonNullable<typeof annonce> => annonce !== null);
  }

  /** Suspension de moderation : distincte du retrait par le vendeur lui-meme et de la
   * verification legale ANDF, motif obligatoire et journalise. */
  async suspendreAnnonce(id: string, dto: SuspendreAnnonceDto, admin: UtilisateurAuthentifie) {
    const annonce = await this.prisma.annonce.findUnique({ where: { id } });
    if (!annonce) {
      throw new NotFoundException("Annonce introuvable");
    }
    if (annonce.statut !== StatutAnnonce.ACTIVE) {
      throw new BadRequestException("Cette annonce n'est plus active");
    }

    const suspendue = await this.prisma.annonce.update({
      where: { id },
      data: { statut: StatutAnnonce.RETIREE, retireeLe: new Date() },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: annonce.parcelleId,
      typeOperation: TypeOperationAudit.SUSPENSION_ADMIN_ANNONCE,
      acteurId: admin.id,
      roleActeur: admin.role as RoleUtilisateur,
      payload: { annonceId: id, motif: dto.motif },
    });

    return suspendue;
  }
}
