import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";

/**
 * Porte la paire de cles Ed25519 utilisee pour signer chaque entree du registre d'audit
 * et les documents scelles (conventions, plans de bornage, titres). En production, injecter
 * AUDIT_ED25519_PRIVATE_KEY / AUDIT_ED25519_PUBLIC_KEY (PEM) depuis un coffre-fort de secrets.
 */
@Injectable()
export class Ed25519KeysService implements OnModuleInit {
  private readonly logger = new Logger(Ed25519KeysService.name);
  private privateKey!: KeyObject;
  private publicKey!: KeyObject;
  publicKeyPem = "";

  onModuleInit() {
    const privatePem = process.env.AUDIT_ED25519_PRIVATE_KEY;
    const publicPem = process.env.AUDIT_ED25519_PUBLIC_KEY;

    if (privatePem && publicPem) {
      this.privateKey = createPrivateKey(privatePem);
      this.publicKey = createPublicKey(publicPem);
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUDIT_ED25519_PRIVATE_KEY/AUDIT_ED25519_PUBLIC_KEY doivent etre definies en production (voir .env.example) : " +
          "sans cles persistantes, chaque redemarrage invaliderait la verifiabilite des signatures deja emises.",
      );
    } else {
      const { privateKey, publicKey } = generateKeyPairSync("ed25519");
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.logger.warn(
        "AUDIT_ED25519_PRIVATE_KEY absente : paire de cles Ed25519 generee en memoire pour cette session " +
          "(developpement uniquement — en production, provisionner des cles persistantes).",
      );
    }

    this.publicKeyPem = this.publicKey.export({ type: "spki", format: "pem" }).toString();
  }

  signer(donnees: Buffer): string {
    return sign(null, donnees, this.privateKey).toString("hex");
  }

  verifier(donnees: Buffer, signatureHex: string, clePubliquePem?: string): boolean {
    try {
      const clePublique = clePubliquePem ? createPublicKey(clePubliquePem) : this.publicKey;
      return verify(null, donnees, clePublique, Buffer.from(signatureHex, "hex"));
    } catch {
      return false;
    }
  }
}
