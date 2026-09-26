import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

const LIBELLE_CONTEXTE: Record<string, string> = {
  INSCRIPTION: "confirmer votre inscription sur AYINON",
  SIGNATURE_FAMILIALE: "confirmer une signature de mandat familial",
  VERROU_PARCELLE: "verrouiller ou deverrouiller une parcelle",
};

/**
 * Envoi d'e-mails transactionnels via Resend. Sans RESEND_API_KEY, envoyerCodeOtp() ne fait rien
 * et renvoie false (voir otp.service.ts, qui journalise alors le code en repli — comportement
 * de developpement, jamais un envoi invente).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;

  private obtenirClient(): Resend | null {
    const cle = process.env.RESEND_API_KEY;
    if (!cle) return null;
    if (!this.client) {
      this.client = new Resend(cle);
    }
    return this.client;
  }

  async envoyerCodeOtp(destinataire: string, code: string, contexte: string): Promise<boolean> {
    const client = this.obtenirClient();
    if (!client) {
      return false;
    }
    const action = LIBELLE_CONTEXTE[contexte] ?? "confirmer une action sur AYINON";
    try {
      const { error } = await client.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "AYINON <notifications@alain-tchougbo.me>",
        to: destinataire,
        subject: `Votre code de confirmation AYINON`,
        html: `
          <p>Utilisez le code suivant pour ${action} :</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:6px;">${code}</p>
          <p>Ce code expire dans 5 minutes. Si vous n'etes pas a l'origine de cette demande, ignorez ce message.</p>
        `,
      });
      if (error) {
        this.logger.error(`Envoi du code OTP par e-mail refuse par Resend : ${error.message}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(`Envoi du code OTP par e-mail echoue : ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  }
}
