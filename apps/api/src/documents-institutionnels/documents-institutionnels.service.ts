import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import * as QRCode from "qrcode";
import {
  RoleUtilisateur,
  TypeOperationAudit,
  type QrDocumentInstitutionnelPayload,
  type SceellerDocumentInstitutionnelDto,
  type VerifierDocumentInstitutionnelDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const DOSSIER_UPLOADS = join(process.cwd(), "uploads", "documents-institutionnels");

/**
 * Scellement generique de documents officiels (hors convention de vente) : reprend exactement le
 * meme mecanisme que ConventionsService (hash SHA-256 + signature Ed25519 + QR), ouvert a toute
 * autorite habilitee pour un document qui n'est pas une vente — ex. une decision institutionnelle
 * numerisee independante d'un dossier CSAF particulier. Voir challenge/PITCH_DECK (pilier
 * "verification anti-fraude") : cette brique est le differenciateur technique central de la
 * plateforme, ici etendue au-dela des seules conventions.
 */
@Injectable()
export class DocumentsInstitutionnelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async sceller(dto: SceellerDocumentInstitutionnelDto, fichier: Express.Multer.File | undefined, utilisateur: UtilisateurAuthentifie) {
    let cheminFichier: string | null = null;
    let hashDocument: string;
    if (fichier) {
      hashDocument = createHash("sha256").update(fichier.buffer).digest("hex");
      await mkdir(DOSSIER_UPLOADS, { recursive: true });
      const nomFichier = `${hashDocument}${extname(fichier.originalname) || ".pdf"}`;
      await writeFile(join(DOSSIER_UPLOADS, nomFichier), fichier.buffer);
      cheminFichier = join("uploads", "documents-institutionnels", nomFichier);
    } else {
      hashDocument = createHash("sha256")
        .update(JSON.stringify({ ...dto, horodatage: new Date().toISOString() }))
        .digest("hex");
    }

    const document = await this.prisma.documentInstitutionnel.create({
      data: {
        titre: dto.titre,
        type: dto.type,
        description: dto.description,
        cheminFichier,
        hashSha256: hashDocument,
        signatureEd25519: "",
        qrPayload: {},
        emetteurId: utilisateur.id,
      },
    });

    const payload: QrDocumentInstitutionnelPayload = {
      documentId: document.id,
      hashSha256: hashDocument,
      horodatage: document.createdAt.toISOString(),
    };
    const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(JSON.stringify(payload)));

    const documentScelle = await this.prisma.documentInstitutionnel.update({
      where: { id: document.id },
      data: { qrPayload: payload, signatureEd25519 },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ payload, signatureEd25519 }));

    await this.cryptoAudit.enregistrer({
      typeOperation: TypeOperationAudit.SCELLEMENT_DOCUMENT_INSTITUTIONNEL,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { documentId: document.id, titre: dto.titre, type: dto.type, hashSha256: hashDocument },
    });

    return { document: documentScelle, qrCodeDataUrl };
  }

  /** Scanner Anti-Fraude, meme principe que ConventionsService.verifier. */
  async verifier(dto: VerifierDocumentInstitutionnelDto) {
    const donneesSignees = Buffer.from(JSON.stringify(dto.payload));
    const signatureValide = this.cryptoAudit.verifierSignature(donneesSignees, dto.signatureEd25519);
    if (!signatureValide) {
      return { authentique: false, motif: "Signature cryptographique invalide : document falsifie ou corrompu" };
    }

    const document = await this.prisma.documentInstitutionnel.findUnique({ where: { id: dto.payload.documentId } });
    if (!document) {
      return { authentique: false, motif: "Aucun document correspondant dans le registre national" };
    }
    if (document.hashSha256 !== dto.payload.hashSha256) {
      return { authentique: false, motif: "Le hash du document ne correspond pas au registre (contenu modifie)" };
    }
    if (!document.valide) {
      return { authentique: false, motif: "Document invalide par l'autorite emettrice" };
    }

    return {
      authentique: true,
      document: { id: document.id, titre: document.titre, type: document.type, description: document.description, creeLe: document.createdAt },
    };
  }

  async lister() {
    return this.prisma.documentInstitutionnel.findMany({
      select: { id: true, titre: true, type: true, description: true, valide: true, createdAt: true, emetteur: { select: { nomComplet: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async obtenirQrCode(id: string) {
    const document = await this.prisma.documentInstitutionnel.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException("Document introuvable");
    }
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ payload: document.qrPayload, signatureEd25519: document.signatureEd25519 }));
    return { qrCodeDataUrl };
  }

  async invalider(id: string, utilisateur: UtilisateurAuthentifie) {
    const document = await this.prisma.documentInstitutionnel.findUnique({ where: { id } });
    if (!document) {
      throw new BadRequestException("Document introuvable");
    }
    const miseAJour = await this.prisma.documentInstitutionnel.update({ where: { id }, data: { valide: false } });

    await this.cryptoAudit.enregistrer({
      typeOperation: TypeOperationAudit.INVALIDATION_DOCUMENT_INSTITUTIONNEL,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { documentId: id },
    });

    return miseAJour;
  }
}
