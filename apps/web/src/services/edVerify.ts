const CLE_STOCKAGE_PEM = "ayinon_cle_publique_audit";

let cleImporteeCache: CryptoKey | null = null;

function pemVersDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return octets.buffer;
}

function hexVersOctets(hex: string): Uint8Array<ArrayBuffer> {
  const paires = hex.match(/.{1,2}/g) ?? [];
  const octets = new Uint8Array(paires.length);
  paires.forEach((o, i) => (octets[i] = Number.parseInt(o, 16)));
  return octets;
}

/** A appeler des qu'un reseau est disponible : met en cache local la cle publique du registre national. */
export async function rafraichirClePubliqueDepuisServeur(): Promise<void> {
  try {
    const reponse = await fetch("/api/audit/cle-publique");
    if (!reponse.ok) return;
    const { clePubliquePem } = (await reponse.json()) as { clePubliquePem: string };
    localStorage.setItem(CLE_STOCKAGE_PEM, clePubliquePem);
    cleImporteeCache = null;
  } catch {
    // Hors-ligne : on conserve la cle deja en cache local, si elle existe.
  }
}

async function obtenirClePubliqueImportee(): Promise<CryptoKey | null> {
  if (cleImporteeCache) return cleImporteeCache;
  const pem = localStorage.getItem(CLE_STOCKAGE_PEM);
  if (!pem) return null;
  try {
    cleImporteeCache = await crypto.subtle.importKey("spki", pemVersDer(pem), { name: "Ed25519" }, false, ["verify"]);
    return cleImporteeCache;
  } catch {
    return null;
  }
}

/**
 * Verification Ed25519 locale (Web Crypto API), sans appel reseau : permet au Scanner Anti-Fraude
 * de confirmer l'authenticite cryptographique d'une convention meme en zone blanche. Cette
 * verification ne porte que sur la signature — elle ne peut pas savoir si le document a ete
 * invalide depuis (ex. mutation annulee), ce que seule l'API /conventions/verifier confirme.
 * Renvoie null si aucune verification locale n'est possible (cle absente ou Ed25519 non supporte
 * par ce navigateur) plutot que de laisser croire a un resultat negatif.
 */
export async function verifierSignatureLocale(payload: unknown, signatureHex: string): Promise<boolean | null> {
  if (!("subtle" in crypto)) return null;
  const cle = await obtenirClePubliqueImportee();
  if (!cle) return null;
  try {
    const donnees = new TextEncoder().encode(JSON.stringify(payload));
    return await crypto.subtle.verify("Ed25519", cle, hexVersOctets(signatureHex), donnees);
  } catch {
    return null;
  }
}
