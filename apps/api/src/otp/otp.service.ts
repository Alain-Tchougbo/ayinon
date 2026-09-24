import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const DUREE_VALIDITE_MS = 5 * 60 * 1000;

/**
 * Codes a usage unique utilises pour confirmer une action sensible (verrouillage anti-vente,
 * signature d'un mandat familial). En production, genererCode() doit dispatcher le code via
 * SMS/WhatsApp (module notifications) au lieu de le journaliser.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async genererCode(utilisateurId: string, contexte: string): Promise<string> {
    const code = String(randomInt(100_000, 999_999));
    await this.prisma.codeOtp.create({
      data: {
        utilisateurId,
        contexte,
        code: this.hacher(code),
        expiresAt: new Date(Date.now() + DUREE_VALIDITE_MS),
      },
    });
    this.logger.debug(`[dev] Code OTP "${contexte}" pour utilisateur ${utilisateurId} : ${code}`);
    return code;
  }

  async verifierCode(utilisateurId: string, contexte: string, code: string): Promise<boolean> {
    const entree = await this.prisma.codeOtp.findFirst({
      where: {
        utilisateurId,
        contexte,
        code: this.hacher(code),
        utilise: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!entree) {
      return false;
    }
    await this.prisma.codeOtp.update({ where: { id: entree.id }, data: { utilise: true } });
    return true;
  }

  private hacher(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }
}
