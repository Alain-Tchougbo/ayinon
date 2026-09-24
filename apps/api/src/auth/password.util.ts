import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const LONGUEUR_CLE = 64;

/** Hachage de mot de passe via scrypt (natif Node, pas de dependance native comme bcrypt). */
export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const derive = (await scrypt(motDePasse, sel, LONGUEUR_CLE)) as Buffer;
  return `${sel.toString("hex")}:${derive.toString("hex")}`;
}

export async function verifierMotDePasse(motDePasse: string, hash: string): Promise<boolean> {
  const [selHex, deriveHex] = hash.split(":");
  if (!selHex || !deriveHex) {
    return false;
  }
  const sel = Buffer.from(selHex, "hex");
  const deriveAttendu = Buffer.from(deriveHex, "hex");
  const deriveCalcule = (await scrypt(motDePasse, sel, LONGUEUR_CLE)) as Buffer;
  return deriveAttendu.length === deriveCalcule.length && timingSafeEqual(deriveAttendu, deriveCalcule);
}
