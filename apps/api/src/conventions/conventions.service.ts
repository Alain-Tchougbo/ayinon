import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import * as QRCode from "qrcode";
import {
  RoleUtilisateur,
  TypeOperationAudit,
  type EnregistrerConventionDto,
  type QrConventionPayload,
  type VerifierConventionDto,
} from "@ayinon/shared";
import type { UtilisateurAuthentifie } from "../common/decorators/current-user.decorator";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { CsafService } from "../csaf/csaf.service";
import { PrismaService } from "../prisma/prisma.service";

const DOSSIER_UPLOADS = join(process.cwd(), "uploads", "conventions");

@Injectable()
export class ConventionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoAudit: CryptoAuditService,
    private readonly csaf: CsafService,
  ) {}

  /** Enregistre une convention de vente, la scelle (SHA-256 + Ed25519) et genere le QR code a imprimer. */
  async enregistrer(dto: EnregistrerConventionDto, fichier: Express.Multer.File | undefined, utilisateur: UtilisateurAuthentifie) {
    const parcelle = await this.prisma.parcelle.findUnique({ where: { id: dto.parcelleId } });
    if (!parcelle) {
      throw new NotFoundException("Parcelle introuvable");
    }
    await this.csaf.verifierParcelleNonGelee(dto.parcelleId);

    let cheminFichier: string | null = null;
    let hashDocument: string;
    if (fichier) {
      hashDocument = createHash("sha256").update(fichier.buffer).digest("hex");
      await mkdir(DOSSIER_UPLOADS, { recursive: true });
      const nomFichier = `${hashDocument}${extname(fichier.originalname) || ".pdf"}`;
      await writeFile(join(DOSSIER_UPLOADS, nomFichier), fichier.buffer);
      cheminFichier = join("uploads", "conventions", nomFichier);
    } else {
      // Sans document numerise joint, on scelle malgre tout les donnees declaratives de la convention.
      hashDocument = createHash("sha256")
        .update(JSON.stringify({ ...dto, horodatage: new Date().toISOString() }))
        .digest("hex");
    }

    const convention = await this.prisma.convention.create({
      data: {
        parcelleId: dto.parcelleId,
        vendeurNom: dto.vendeurNom,
        acquereurNom: dto.acquereurNom,
        montantFcfa: dto.montantFcfa,
        cheminFichier,
        hashSha256: hashDocument,
        signatureEd25519: "",
        qrPayload: {},
        creeParId: utilisateur.id,
      },
    });

    const payload: QrConventionPayload = {
      conventionId: convention.id,
      hashSha256: hashDocument,
      horodatage: convention.createdAt.toISOString(),
    };
    const signatureEd25519 = this.cryptoAudit.signerDonnees(Buffer.from(JSON.stringify(payload)));

    const conventionScellee = await this.prisma.convention.update({
      where: { id: convention.id },
      data: { qrPayload: payload, signatureEd25519 },
    });

    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ payload, signatureEd25519 }));

    await this.cryptoAudit.enregistrer({
      parcelleId: dto.parcelleId,
      typeOperation: TypeOperationAudit.ENREGISTREMENT_CONVENTION,
      acteurId: utilisateur.id,
      roleActeur: utilisateur.role as RoleUtilisateur,
      payload: { conventionId: convention.id, hashSha256: hashDocument },
    });

    return { convention: conventionScellee, qrCodeDataUrl };
  }

  /** Scanner Anti-Fraude : verifie la signature Ed25519 du QR puis la coherence avec le registre. */
  async verifier(dto: VerifierConventionDto) {
    const donneesSignees = Buffer.from(JSON.stringify(dto.payload));
    const signatureValide = this.cryptoAudit.verifierSignature(donneesSignees, dto.signatureEd25519);
    if (!signatureValide) {
      return { authentique: false, motif: "Signature cryptographique invalide : document falsifie ou corrompu" };
    }

    const convention = await this.prisma.convention.findUnique({ where: { id: dto.payload.conventionId } });
    if (!convention) {
      return { authentique: false, motif: "Aucune convention correspondante dans le registre national" };
    }
    if (convention.hashSha256 !== dto.payload.hashSha256) {
      return { authentique: false, motif: "Le hash du document ne correspond pas au registre (contenu modifie)" };
    }
    if (!convention.valide) {
      return { authentique: false, motif: "Convention invalidee par l'administration (ex. mutation annulee)" };
    }

    return {
      authentique: true,
      convention: {
        id: convention.id,
        parcelleId: convention.parcelleId,
        vendeurNom: convention.vendeurNom,
        acquereurNom: convention.acquereurNom,
        montantFcfa: convention.montantFcfa,
        creeLe: convention.createdAt,
      },
    };
  }

  async invalider(conventionId: string) {
    const convention = await this.prisma.convention.findUnique({ where: { id: conventionId } });
    if (!convention) {
      throw new BadRequestException("Convention introuvable");
    }
    return this.prisma.convention.update({ where: { id: conventionId }, data: { valide: false } });
  }
}
