# Securite — AYINON

## 1. Authentification & sessions

- JWT d'acces (`apps/api/src/auth`), signe HMAC (`JWT_ACCESS_SECRET`), duree courte (`JWT_ACCESS_TTL`,
  15 min par defaut), transporte en cookie `ayinon_access_token` : `HttpOnly`, `SameSite=Strict`, `Secure`
  en production, `path=/api`.
- Jeton de rafraichissement **opaque** (48 octets aleatoires, pas un JWT) : seul son hash SHA-256 est
  persiste (`RefreshToken.tokenHash`), ce qui le rend individuellement revocable (deconnexion, rotation a
  chaque usage). Cookie `ayinon_refresh_token`, portee restreinte a `path=/api/auth`.
- Mots de passe haches via `scrypt` (`node:crypto`, sans dependance native type bcrypt — evite les soucis de
  compilation multiplateforme tout en restant resistant au brute-force).

## 2. RBAC

Sept roles (`RoleUtilisateur`) : `CITOYEN`, `GEOMETRE`, `NOTAIRE`, `MANDATAIRE_FAMILIAL`, `AGENT_ANDF`,
`MAGISTRAT_CSAF`, `ADMIN`. Appliques via un guard global (`JwtAuthGuard` + `RolesGuard`, montes en
`APP_GUARD` dans `app.module.ts`) et le decorateur `@Roles(...)` par route. Toute route est protegee par
defaut ; `@Public()` l'exempte explicitement (ex. recherche cadastrale, verification de convention, depot
d'opposition par un voisin non inscrit).

| Action sensible | Role requis |
|---|---|
| Verrouiller/deverrouiller une parcelle (passeport foncier) | `CITOYEN` (proprietaire enregistre uniquement, + OTP) |
| Importer/signer un plan de bornage | `GEOMETRE` |
| Ouvrir un protocole multi-signature | `CITOYEN`, `MANDATAIRE_FAMILIAL`, `AGENT_ANDF`, `ADMIN` |
| Signer un mandat familial | `MANDATAIRE_FAMILIAL` (le mandataire designe uniquement, + OTP) |
| Geler / lever un gel conservatoire | `MAGISTRAT_CSAF` |
| Consulter la console de pilotage par pole | `AGENT_ANDF`, `MAGISTRAT_CSAF`, `ADMIN` |
| Verifier l'integrite globale du registre d'audit | `ADMIN`, `AGENT_ANDF`, `MAGISTRAT_CSAF` |

## 3. CSRF

Protection par double-soumission de cookie (`CsrfGuard`) : a la connexion, un jeton aleatoire est pose dans
un cookie **non-httpOnly** `ayinon_csrf_token` (le frontend doit pouvoir le lire pour le renvoyer). Toute
requete mutante (POST/PUT/PATCH/DELETE) doit repeter cette valeur dans l'en-tete `X-CSRF-Token` ; sinon
rejet `403`. Les routes `@Public()` (qui n'exploitent jamais le cookie de session pour determiner l'auteur
de l'action) en sont exemptees — un site tiers ne peut de toute facon rien y accomplir "au nom" d'un
utilisateur puisque ces routes ne s'appuient pas sur l'identite issue du cookie.

## 4. Rate limiting & durcissement HTTP

- `@nestjs/throttler` : 120 requetes/minute par IP par defaut (`app.module.ts`).
- `helmet` (en-tetes de securite), `cookie-parser`, CORS restreint a `WEB_ORIGIN` avec `credentials: true`.
- Validation stricte de toute entree via des schemas **Zod partages** entre frontend et backend
  (`packages/shared/src/schemas`), appliques cote serveur par un pipe (`ZodValidationPipe`) — aucune donnee
  non validee n'atteint la couche metier.

## 5. Registre d'audit cryptographique (le "ledger")

Implementation : `apps/api/src/crypto-audit/crypto-audit.service.ts`.

Chaque operation sensible (creation de parcelle, verrouillage, import de bornage, chevauchement detecte,
signature familiale, ouverture de ban, opposition deposee, gel/levee CSAF, enregistrement de convention...)
est ajoutee comme une entree **chainee** dans `MutationAudit` :

```
hashPayload   = SHA256( JSON canonique du payload )
hashBloc      = SHA256( hashBlocPrecedent + hashPayload + horodatage )
signature     = Ed25519( hashBloc )
```

- La **serialisation canonique** (cles JSON triees) garantit qu'un meme contenu produit toujours le meme
  hash, quel que soit l'ordre d'insertion des champs.
- Le chainage utilise un compteur monotone (`MutationAudit.sequence`, auto-incremente) — et non
  l'horodatage seul — pour determiner sans ambiguite le bloc precedent : deux ecritures survenant dans la
  meme milliseconde ne doivent jamais casser l'ordre du registre.
- `verifierIntegriteRegistre()` reparcourt l'intégralite de la chaine, recalcule chaque `hashBloc` et
  revalide chaque signature Ed25519. Toute alteration retroactive d'une seule ligne (donnee modifiee
  directement en base, par exemple) est detectee et localisee (`premiereAlterationId`).
- `GET /api/audit/cle-publique` (public) expose la cle publique Ed25519 du registre, permettant une
  verification independante hors-ligne des signatures apposees sur les conventions et plans de bornage.

**Limite connue et mitigation** : deux ecritures strictement concurrentes pourraient en theorie lire le
meme "dernier bloc" avant que l'une des deux ne committe (condition de course classique sur un ledger
append-only). Le compteur `sequence` (contrainte `@unique` en base) garantit qu'aucune des deux entrees ne
peut usurper le rang de l'autre silencieusement — au pire une erreur de contrainte unique est levee, jamais
une corruption silencieuse. Pour une charge nationale a fort debit d'ecriture concurrente, ajouter une
transaction `SERIALIZABLE` ou un verrou consultatif (`pg_advisory_xact_lock`) autour de `enregistrer()`.

## 6. Gestion des cles Ed25519

`Ed25519KeysService` (`apps/api/src/crypto-audit/ed25519-keys.service.ts`) charge la paire de cles depuis
`AUDIT_ED25519_PRIVATE_KEY` / `AUDIT_ED25519_PUBLIC_KEY` (PEM). **En developpement**, si ces variables sont
absentes, une paire est generee en memoire pour la duree du processus (avec avertissement explicite dans les
logs) — pratique pour demarrer sans configuration, mais toute donnee scellee est perdue (non re-verifiable)
au redemarrage. **En production**, ces cles doivent etre provisionnees de facon persistante depuis un
coffre-fort de secrets (HSM, Vault, KMS) et jamais commitees.

## 7. Scanner anti-fraude — verification hors-ligne

Le QR code appose sur une convention encode `{payload, signatureEd25519}` (voir `ConventionsService`). Le
frontend (`ConventionScanner.vue`) peut verifier la signature localement des lors qu'il dispose de la cle
publique (recuperable via `/api/audit/cle-publique` et cache localement) ; la verification serveur
(`POST /api/conventions/verifier`) reste la reference car elle croise en plus le hash avec le registre
(document falsifie apres coup) et l'etat `valide` de la convention (ex. mutation annulee).
