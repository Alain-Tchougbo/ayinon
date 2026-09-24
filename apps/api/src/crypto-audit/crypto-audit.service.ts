import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import type { RoleUtilisateur, TypeOperationAudit } from "@ayinon/shared";
import { PrismaService } from "../prisma/prisma.service";
import { Ed25519KeysService } from "./ed25519-keys.service";

const HASH_GENESE = "0".repeat(64);

/** Serialisation JSON canonique (cles triees) : deux payloads equivalents produisent toujours le meme hash. */
function canonicaliser(valeur: unknown): string {
  if (valeur === null || typeof valeur !== "object") {
    return JSON.stringify(valeur);
  }
  if (Array.isArray(valeur)) {
    return `[${valeur.map(canonicaliser).join(",")}]`;
  }
  const cles = Object.keys(valeur as Record<string, unknown>).sort();
  const paires = cles.map((cle) => `${JSON.stringify(cle)}:${canonicaliser((valeur as Record<string, unknown>)[cle])}`);
  return `{${paires.join(",")}}`;
}

export interface EntreeAudit {
  parcelleId?: string;
  typeOperation: TypeOperationAudit;
  acteurId?: string;
  roleActeur?: RoleUtilisateur;
  payload: Record<string, unknown>;
}

export type ResultatIntegrite =
  | { valide: true; nombreEntrees: number }
  | { valide: false; premiereAlterationId: string; raison: string };

/**
 * Registre d'audit cryptographique national : chaque operation sensible (creation de
 * parcelle, chevauchement detecte, gel CSAF, signature familiale, ...) est ajoutee comme
 * un bloc chaine au precedent (façon ledger), horodate et signe Ed25519. Toute alteration
 * retroactive d'une ligne casse le chainage et est detectee par verifierIntegriteRegistre().
 */
@Injectable()
export class CryptoAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cles: Ed25519KeysService,
  ) {}

  hashPayload(payload: unknown): string {
    return createHash("sha256").update(canonicaliser(payload)).digest("hex");
  }

  private calculerHashBloc(hashBlocPrecedent: string, hashPayload: string, horodatage: Date): string {
    const contenu = `${hashBlocPrecedent}:${hashPayload}:${horodatage.toISOString()}`;
    return createHash("sha256").update(contenu).digest("hex");
  }

  async enregistrer(entree: EntreeAudit) {
    // Tri par sequence (compteur monotone), pas par horodatage : deux ecritures dans la meme
    // milliseconde ne doivent jamais faire perdre la trace du veritable dernier bloc.
    const derniere = await this.prisma.mutationAudit.findFirst({ orderBy: { sequence: "desc" } });
    const hashBlocPrecedent = derniere?.hashBloc ?? HASH_GENESE;
    const hashPayload = this.hashPayload(entree.payload);
    const horodatage = new Date();
    const hashBloc = this.calculerHashBloc(hashBlocPrecedent, hashPayload, horodatage);
    const signatureEd25519 = this.cles.signer(Buffer.from(hashBloc, "hex"));

    return this.prisma.mutationAudit.create({
      data: {
        parcelleId: entree.parcelleId,
        typeOperation: entree.typeOperation,
        acteurId: entree.acteurId,
        roleActeur: entree.roleActeur,
        payload: entree.payload as Prisma.InputJsonValue,
        hashPayload,
        hashBlocPrecedent,
        hashBloc,
        signatureEd25519,
        horodatage,
      },
    });
  }

  /** Reparcourt l'integralite de la chaine et revalide hachage + signature de chaque bloc. */
  async verifierIntegriteRegistre(): Promise<ResultatIntegrite> {
    const entrees = await this.prisma.mutationAudit.findMany({ orderBy: { sequence: "asc" } });
    let hashPrecedentAttendu = HASH_GENESE;

    for (const entree of entrees) {
      if (entree.hashBlocPrecedent !== hashPrecedentAttendu) {
        return { valide: false, premiereAlterationId: entree.id, raison: "Chainage rompu (hash precedent incoherent)" };
      }
      const hashRecalcule = this.calculerHashBloc(entree.hashBlocPrecedent, entree.hashPayload, entree.horodatage);
      if (hashRecalcule !== entree.hashBloc) {
        return { valide: false, premiereAlterationId: entree.id, raison: "Hash de bloc incoherent (donnees modifiees)" };
      }
      if (!this.cles.verifier(Buffer.from(entree.hashBloc, "hex"), entree.signatureEd25519)) {
        return { valide: false, premiereAlterationId: entree.id, raison: "Signature Ed25519 invalide" };
      }
      hashPrecedentAttendu = entree.hashBloc;
    }

    return { valide: true, nombreEntrees: entrees.length };
  }

  async historiqueParcelle(parcelleId: string) {
    return this.prisma.mutationAudit.findMany({
      where: { parcelleId },
      orderBy: { sequence: "asc" },
    });
  }

  get clePubliqueRegistre(): string {
    return this.cles.publicKeyPem;
  }

  /** Signature Ed25519 generique, utilisee pour sceller conventions, plans de bornage et titres. */
  signerDonnees(donnees: Buffer): string {
    return this.cles.signer(donnees);
  }

  verifierSignature(donnees: Buffer, signatureHex: string, clePubliquePem?: string): boolean {
    return this.cles.verifier(donnees, signatureHex, clePubliquePem);
  }
}
