import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  DUREE_BAN_OPPOSITION_JOURS,
  RoleUtilisateur,
  StatutBan,
  StatutSignatureFamille,
  TypeOperationAudit,
  type DeposerOppositionDto,
  type OuvrirMultiSignatureDto,
  type SignerMandatDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { CsafService } from "../csaf/csaf.service";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";

const CONTEXTE_OTP_SIGNATURE = "SIGNATURE_FAMILIALE";

@Injectable()
export class FamillesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
    private readonly otp: OtpService,
    private readonly csaf: CsafService,
  ) {}

  /**
   * Ouvre un protocole de multi-signature pour une mutation de terre hereditaire. Le schema Zod
   * (OuvrirMultiSignatureSchema) garantit deja la presence d'un Aine, d'un Representant des
   * femmes et d'au moins un Cadet parmi les mandataires designes — le quorum minimal du "Ayinon" traditionnel.
   */
  async ouvrirMultiSignature(dto: OuvrirMultiSignatureDto, utilisateur: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    await this.csaf.verifierParcelleNonGelee(dto.parcelleId);

    const signatures = [];
    for (const mandataireDto of dto.mandataires) {
      const mandataire =
        (await this.trouverMandataireExistant(mandataireDto.proprietaireId, mandataireDto.role)) ??
        (await this.prisma.mandataireFamille.create({
          data: { proprietaireId: mandataireDto.proprietaireId, role: mandataireDto.role },
        }));

      const signature = await this.prisma.signatureFamille.upsert({
        where: { parcelleId_mandataireId: { parcelleId: dto.parcelleId, mandataireId: mandataire.id } },
        update: {},
        create: {
          parcelleId: dto.parcelleId,
          mandataireId: mandataire.id,
          role: mandataireDto.role,
          statut: StatutSignatureFamille.EN_ATTENTE,
        },
      });
      signatures.push(signature);
    }

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.DEMANDE_MULTISIGNATURE,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { nombreMandataires: dto.mandataires.length },
    });

    return signatures;
  }

  async demanderOtpSignature(utilisateur: UtilisateurAuthentifie) {
    const code = await this.otp.genererCode(utilisateur.id, CONTEXTE_OTP_SIGNATURE);
    return { message: "Code envoye (SMS/WhatsApp en production)", codeDebug: process.env.NODE_ENV === "production" ? undefined : code };
  }

  async signerMandat(dto: SignerMandatDto, utilisateur: UtilisateurAuthentifie) {
    const signature = await this.prisma.signatureFamille.findUnique({
      where: { id: dto.signatureFamilleId },
      include: { mandataire: true },
    });
    if (!signature) {
      throw new NotFoundException("Demande de signature introuvable");
    }
    if (!utilisateur.proprietaireId || signature.mandataire.proprietaireId !== utilisateur.proprietaireId) {
      throw new ForbiddenException("Seul le mandataire designe peut signer ce mandat");
    }
    if (signature.statut !== StatutSignatureFamille.EN_ATTENTE) {
      throw new BadRequestException("Cette signature a deja ete traitee");
    }

    const codeValide = await this.otp.verifierCode(utilisateur.id, CONTEXTE_OTP_SIGNATURE, dto.codeOtp);
    if (!codeValide) {
      throw new BadRequestException("Code de confirmation invalide ou expire");
    }

    const nouveauStatut = dto.accepte ? StatutSignatureFamille.SIGNEE : StatutSignatureFamille.REFUSEE;
    const hashSha256 = this.cryptoAudit.hashPayload({ signatureFamilleId: dto.signatureFamilleId, accepte: dto.accepte });

    const signatureMiseAJour = await this.prisma.signatureFamille.update({
      where: { id: dto.signatureFamilleId },
      data: { statut: nouveauStatut, signeLe: new Date(), hashSha256 },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: signature.parcelleId,
      typeOperation: TypeOperationAudit.SIGNATURE_FAMILIALE,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { signatureFamilleId: dto.signatureFamilleId, role: signature.role, accepte: dto.accepte },
    });

    if (dto.accepte) {
      await this.tenterOuvertureBan(signature.parcelleId);
    }

    return signatureMiseAJour;
  }

  async deposerOpposition(dto: DeposerOppositionDto) {
    const ban = await this.prisma.banOpposition.findUnique({ where: { id: dto.banId } });
    if (!ban) {
      throw new NotFoundException("Periode d'affichage introuvable");
    }
    if (ban.statut !== StatutBan.OUVERT || ban.dateFin < new Date()) {
      throw new BadRequestException("La periode legale d'opposition (15 jours) est close");
    }

    const opposition = await this.prisma.opposition.create({
      data: {
        banId: dto.banId,
        opposantNom: dto.opposantNom,
        opposantContact: dto.opposantContact,
        motif: dto.motif,
      },
    });

    await this.cryptoAudit.enregistrer({
      parcelleId: ban.parcelleId,
      typeOperation: TypeOperationAudit.OPPOSITION_DEPOSEE,
      payload: { banId: dto.banId, oppositionId: opposition.id },
    });

    return opposition;
  }

  async cloturerBan(banId: string) {
    const ban = await this.prisma.banOpposition.findUnique({ where: { id: banId }, include: { oppositions: true } });
    if (!ban) {
      throw new NotFoundException("Periode d'affichage introuvable");
    }
    if (ban.dateFin > new Date()) {
      throw new BadRequestException("Le delai legal de 15 jours n'est pas encore ecoule");
    }

    const statut = ban.oppositions.length > 0 ? StatutBan.CLOS_AVEC_OPPOSITION : StatutBan.CLOS_SANS_OPPOSITION;
    const banCloture = await this.prisma.banOpposition.update({ where: { id: banId }, data: { statut } });

    await this.cryptoAudit.enregistrer({
      parcelleId: ban.parcelleId,
      typeOperation: TypeOperationAudit.CLOTURE_BAN,
      payload: { banId, statut, nombreOppositions: ban.oppositions.length },
    });

    return banCloture;
  }

  /**
   * Signatures reellement en attente POUR CET utilisateur (via ses mandats familiaux) : evite au
   * mandataire de devoir deviner/chercher le NUP d'une parcelle pour savoir qu'on attend sa signature.
   */
  async listerMesSignaturesEnAttente(proprietaireId: string) {
    return this.prisma.signatureFamille.findMany({
      where: { statut: StatutSignatureFamille.EN_ATTENTE, mandataire: { proprietaireId } },
      include: { parcelle: { select: { id: true, nup: true, commune: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async obtenirEtatParcelle(parcelleId: string) {
    const [signatures, bans] = await Promise.all([
      this.prisma.signatureFamille.findMany({
        where: { parcelleId },
        include: { mandataire: { include: { proprietaire: true } } },
      }),
      this.prisma.banOpposition.findMany({ where: { parcelleId }, include: { oppositions: true }, orderBy: { dateDebut: "desc" } }),
    ]);

    const quorumAtteint =
      signatures.length > 0 && signatures.every((s) => s.statut === StatutSignatureFamille.SIGNEE);

    return { signatures, quorumAtteint, bans };
  }

  private async tenterOuvertureBan(parcelleId: string) {
    const signatures = await this.prisma.signatureFamille.findMany({ where: { parcelleId } });
    const quorumAtteint = signatures.length > 0 && signatures.every((s) => s.statut === StatutSignatureFamille.SIGNEE);
    if (!quorumAtteint) {
      return;
    }

    const banExistant = await this.prisma.banOpposition.findFirst({ where: { parcelleId, statut: StatutBan.OUVERT } });
    if (banExistant) {
      return;
    }

    const dateFin = new Date(Date.now() + DUREE_BAN_OPPOSITION_JOURS * 24 * 60 * 60 * 1000);
    const ban = await this.prisma.banOpposition.create({ data: { parcelleId, dateFin } });

    await this.cryptoAudit.enregistrer({
      parcelleId,
      typeOperation: TypeOperationAudit.OUVERTURE_BAN,
      payload: { banId: ban.id, dateFin: dateFin.toISOString() },
    });
  }

  private async trouverMandataireExistant(proprietaireId: string, role: string) {
    return this.prisma.mandataireFamille.findFirst({ where: { proprietaireId, role: role as never } });
  }
}
