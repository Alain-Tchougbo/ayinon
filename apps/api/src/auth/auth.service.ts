import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import { ROLES_PROFESSIONNELS_INSCRIPTIBLES, StatutValidationPro, TypeOperationAudit, type InscriptionDto, type RoleUtilisateur } from "@ayinon/shared";
import { parseDureeMs } from "../common/duree.util";
import { CryptoAuditService } from "../crypto-audit/crypto-audit.service";
import { OtpService } from "../otp/otp.service";
import { PrismaService } from "../prisma/prisma.service";
import { hacherMotDePasse, verifierMotDePasse } from "./password.util";
import type { JwtPayload } from "./jwt.strategy";

export interface PaireJetons {
  accessToken: string;
  refreshToken: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
}

const CONTEXTE_OTP_INSCRIPTION = "INSCRIPTION";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otp: OtpService,
    private readonly cryptoAudit: CryptoAuditService,
  ) {}

  async connexion(email: string, motDePasse: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur || !(await verifierMotDePasse(motDePasse, utilisateur.motDePasseHash))) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    if (!utilisateur.emailValide) {
      throw new UnauthorizedException("Compte non confirme : verifiez le code envoye a votre inscription");
    }
    if (utilisateur.compteSuspenduLe) {
      throw new UnauthorizedException(
        `Compte suspendu${utilisateur.motifSuspensionCompte ? " : " + utilisateur.motifSuspensionCompte : ""}`,
      );
    }
    if (utilisateur.statutValidationPro === StatutValidationPro.EN_ATTENTE) {
      throw new UnauthorizedException("Votre compte professionnel est en attente de validation par un administrateur");
    }
    if (utilisateur.statutValidationPro === StatutValidationPro.REJETE) {
      throw new UnauthorizedException(
        `Votre demande de compte professionnel a ete rejetee${utilisateur.motifRejetPro ? " : " + utilisateur.motifRejetPro : ""}`,
      );
    }
    const jetons = await this.emettreJetons(utilisateur.id, utilisateur.role, utilisateur.proprietaireId);
    return { utilisateur, jetons };
  }

  /** Inscription en libre-service (E0.1/E0.5) : le compte existe mais reste inactif
   * (emailValide=false) tant que le code OTP n'est pas confirme via confirmerInscription(). Pour
   * un role professionnel (GEOMETRE/NOTAIRE/AGENT_BANQUE), meme apres confirmation du code, le
   * compte reste bloque a la connexion tant qu'un admin ne l'a pas approuve (E0.6). */
  async inscrire(dto: InscriptionDto): Promise<{ codeDebug: string }> {
    const existant = await this.prisma.utilisateur.findUnique({ where: { email: dto.email } });
    if (existant) {
      throw new ConflictException("Un compte existe deja avec cet e-mail");
    }

    const estProfessionnel = (ROLES_PROFESSIONNELS_INSCRIPTIBLES as readonly string[]).includes(dto.role);
    const motDePasseHash = await hacherMotDePasse(dto.motDePasse);
    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        email: dto.email,
        motDePasseHash,
        role: dto.role as RoleUtilisateur,
        nomComplet: dto.nomComplet,
        telephone: dto.telephone,
        statutDeclarant: dto.statutDeclarant,
        numeroAgrement: dto.numeroAgrement,
        statutValidationPro: estProfessionnel ? StatutValidationPro.EN_ATTENTE : StatutValidationPro.NON_APPLICABLE,
        emailValide: false,
      },
    });

    if (estProfessionnel) {
      await this.cryptoAudit.enregistrer({
        typeOperation: TypeOperationAudit.DEMANDE_VALIDATION_PRO,
        acteurId: utilisateur.id,
        roleActeur: utilisateur.role,
        payload: { compteId: utilisateur.id, role: utilisateur.role, numeroAgrement: dto.numeroAgrement ?? null },
      });
    }

    const codeDebug = await this.otp.genererCode(utilisateur.id, CONTEXTE_OTP_INSCRIPTION);
    return { codeDebug };
  }

  /** jetons reste null si le compte est un professionnel encore en attente de validation admin :
   * l'e-mail est confirme, mais la connexion demeure bloquee (voir connexion() ci-dessus). */
  async confirmerInscription(email: string, code: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({ where: { email } });
    if (!utilisateur) {
      throw new BadRequestException("Aucune inscription en attente pour cet e-mail");
    }
    const codeValide = await this.otp.verifierCode(utilisateur.id, CONTEXTE_OTP_INSCRIPTION, code);
    if (!codeValide) {
      throw new BadRequestException("Code de confirmation invalide ou expire");
    }

    const utilisateurConfirme = await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { emailValide: true },
    });

    if (utilisateurConfirme.statutValidationPro === StatutValidationPro.EN_ATTENTE) {
      return { utilisateur: utilisateurConfirme, jetons: null };
    }

    const jetons = await this.emettreJetons(utilisateurConfirme.id, utilisateurConfirme.role, utilisateurConfirme.proprietaireId);
    return { utilisateur: utilisateurConfirme, jetons };
  }

  async rafraichir(refreshTokenBrut: string) {
    const tokenHash = this.hacherRefreshToken(refreshTokenBrut);
    const enregistrement = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { utilisateur: true },
    });
    if (!enregistrement) {
      throw new UnauthorizedException("Session expiree, veuillez vous reconnecter");
    }
    if (enregistrement.utilisateur.compteSuspenduLe) {
      throw new UnauthorizedException("Compte suspendu");
    }

    await this.prisma.refreshToken.update({
      where: { id: enregistrement.id },
      data: { revokedAt: new Date() },
    });

    const jetons = await this.emettreJetons(
      enregistrement.utilisateur.id,
      enregistrement.utilisateur.role,
      enregistrement.utilisateur.proprietaireId,
    );
    return { utilisateur: enregistrement.utilisateur, jetons };
  }

  async deconnexion(refreshTokenBrut: string | undefined) {
    if (!refreshTokenBrut) return;
    const tokenHash = this.hacherRefreshToken(refreshTokenBrut);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async creerCompte(donnees: {
    email: string;
    motDePasse: string;
    role: JwtPayload["role"];
    nomComplet: string;
    proprietaireId?: string;
  }) {
    const motDePasseHash = await hacherMotDePasse(donnees.motDePasse);
    return this.prisma.utilisateur.create({
      data: {
        email: donnees.email,
        motDePasseHash,
        role: donnees.role,
        nomComplet: donnees.nomComplet,
        proprietaireId: donnees.proprietaireId,
      },
    });
  }

  private async emettreJetons(utilisateurId: string, role: JwtPayload["role"], proprietaireId: string | null): Promise<PaireJetons> {
    const accessTokenTtl = process.env.JWT_ACCESS_TTL ?? "15m";
    const refreshTokenTtl = process.env.JWT_REFRESH_TTL ?? "7d";

    const payload: JwtPayload = { sub: utilisateurId, role, proprietaireId };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-a-ne-jamais-utiliser-en-prod",
      expiresIn: accessTokenTtl,
    });

    const refreshTokenBrut = randomBytes(48).toString("hex");
    const refreshTokenTtlMs = parseDureeMs(refreshTokenTtl);
    await this.prisma.refreshToken.create({
      data: {
        utilisateurId,
        tokenHash: this.hacherRefreshToken(refreshTokenBrut),
        expiresAt: new Date(Date.now() + refreshTokenTtlMs),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenBrut,
      accessTokenTtlMs: parseDureeMs(accessTokenTtl),
      refreshTokenTtlMs,
    };
  }

  private hacherRefreshToken(refreshTokenBrut: string): string {
    return createHash("sha256").update(refreshTokenBrut).digest("hex");
  }
}
