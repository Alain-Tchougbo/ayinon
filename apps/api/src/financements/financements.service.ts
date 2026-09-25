import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { RoleUtilisateur, StatutDemandeFinancement, TypeOperationAudit, type DemanderFinancementDto, type TraiterFinancementDto } from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const DOSSIER_FINANCEMENTS = join(process.cwd(), "uploads", "financements");

const INCLUSION_DEMANDE = {
  acheteur: { select: { id: true, nomComplet: true } },
  annonce: { select: { id: true, parcelle: { select: { nup: true, commune: true } } } },
} as const;

/**
 * Demande d'accord de financement (E4.6-E4.8) : l'acheteur demande un accord de principe a une
 * banque partenaire, avec une piece jointe optionnelle qu'elle seule peut consulter. Aucun
 * scoring automatique : la banque tranche elle-meme. Un accord genere un code de verification
 * que le vendeur peut utiliser pour authentifier l'attestation sans contacter la banque (E4.8).
 */
@Injectable()
export class FinancementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async demander(dto: DemanderFinancementDto, fichier: Express.Multer.File | undefined, acheteur: UtilisateurAuthentifie) {
    let cheminDocument: string | null = null;
    if (fichier) {
      await mkdir(DOSSIER_FINANCEMENTS, { recursive: true });
      const hash = createHash("sha256").update(fichier.buffer).digest("hex");
      const nomFichier = `${hash}${extname(fichier.originalname) || ".pdf"}`;
      await writeFile(join(DOSSIER_FINANCEMENTS, nomFichier), fichier.buffer);
      cheminDocument = join("uploads", "financements", nomFichier);
    }

    const demande = await this.prisma.demandeFinancement.create({
      data: { acheteurId: acheteur.id, montantSouhaiteFcfa: dto.montantSouhaiteFcfa, annonceId: dto.annonceId, cheminDocument },
      include: INCLUSION_DEMANDE,
    });

    await this.cryptoAudit.enregistrer({
      typeOperation: TypeOperationAudit.DEMANDE_FINANCEMENT,
      acteurId: acheteur.id,
      roleActeur: acheteur.role as RoleUtilisateur,
      payload: { demandeId: demande.id, montantSouhaiteFcfa: dto.montantSouhaiteFcfa },
    });

    return demande;
  }

  async mesDemandes(acheteurId: string) {
    return this.prisma.demandeFinancement.findMany({ where: { acheteurId }, include: INCLUSION_DEMANDE, orderBy: { createdAt: "desc" } });
  }

  async demandesATraiter() {
    return this.prisma.demandeFinancement.findMany({
      where: { statut: StatutDemandeFinancement.EN_ATTENTE },
      include: INCLUSION_DEMANDE,
      orderBy: { createdAt: "asc" },
    });
  }

  /** E4.7 : l'acces est trace — dateConsultation n'est posee qu'une seule fois, a la premiere ouverture. */
  async obtenirParId(id: string, agent: UtilisateurAuthentifie) {
    const demande = await this.prisma.demandeFinancement.findUnique({ where: { id }, include: INCLUSION_DEMANDE });
    if (!demande) {
      throw new NotFoundException("Demande de financement introuvable");
    }
    if (!demande.dateConsultation) {
      await this.prisma.demandeFinancement.update({ where: { id }, data: { dateConsultation: new Date() } });
      await this.cryptoAudit.enregistrer({
        typeOperation: TypeOperationAudit.CONSULTATION_FINANCEMENT,
        acteurId: agent.id,
        roleActeur: agent.role as RoleUtilisateur,
        payload: { demandeId: id },
      });
    }
    return demande;
  }

  async traiter(id: string, dto: TraiterFinancementDto, agent: UtilisateurAuthentifie) {
    const demande = await this.prisma.demandeFinancement.findUnique({ where: { id } });
    if (!demande) {
      throw new NotFoundException("Demande de financement introuvable");
    }
    if (demande.statut !== StatutDemandeFinancement.EN_ATTENTE) {
      throw new BadRequestException("Cette demande a deja ete traitee");
    }

    const accorde = dto.decision === "ACCORD_PRINCIPE";
    const misAJour = await this.prisma.demandeFinancement.update({
      where: { id },
      data: {
        statut: accorde ? StatutDemandeFinancement.ACCORD_PRINCIPE : StatutDemandeFinancement.REFUSEE,
        traiteeParId: agent.id,
        dateTraitement: new Date(),
        montantAccordeFcfa: accorde ? dto.montantAccordeFcfa : null,
        motifRefus: accorde ? null : dto.motifRefus,
        codeVerification: accorde ? randomBytes(4).toString("hex").toUpperCase() : null,
      },
      include: INCLUSION_DEMANDE,
    });

    await this.cryptoAudit.enregistrer({
      typeOperation: TypeOperationAudit.TRAITEMENT_FINANCEMENT,
      acteurId: agent.id,
      roleActeur: agent.role as RoleUtilisateur,
      payload: { demandeId: id, decision: dto.decision },
    });

    return misAJour;
  }

  /** E4.8 : le vendeur verifie une attestation sans avoir a contacter la banque. */
  async verifierCode(code: string) {
    const demande = await this.prisma.demandeFinancement.findUnique({
      where: { codeVerification: code },
      include: { acheteur: { select: { nomComplet: true } } },
    });
    if (!demande || demande.statut !== StatutDemandeFinancement.ACCORD_PRINCIPE) {
      return { valide: false as const };
    }
    return {
      valide: true as const,
      acheteurNom: demande.acheteur.nomComplet,
      montantAccordeFcfa: demande.montantAccordeFcfa,
      dateEmission: demande.dateTraitement,
    };
  }
}
