# Deploiement (Coolify)

## Architecture retenue

Le frontend appelle toujours l'API en chemin relatif (`BASE_URL = "/api"` dans
`apps/web/src/services/api.ts`, meme mecanisme que le proxy dev de Vite). En production, un seul
domaine public est donc necessaire : le conteneur `web` (nginx) sert le SPA compile et relaie
`/api/*` vers le conteneur `api` sur le reseau Docker interne. L'API n'a pas besoin d'etre exposee
publiquement — seul `web` recoit un domaine.

Consequence pratique : pas de probleme de cookies cross-site (les cookies d'authentification sont
`SameSite=strict`, voir `apps/api/src/common/cookies.util.ts`) puisque le navigateur ne parle
jamais qu'a un seul domaine.

## Fichiers

- `apps/api/Dockerfile`, `apps/web/Dockerfile` : builds multi-stage (contexte = **racine du
  monorepo**, obligatoire pour que pnpm voie `pnpm-lock.yaml`, `pnpm-workspace.yaml` et
  `packages/shared`).
- `apps/web/nginx.conf.template` + `docker-entrypoint.sh` : le port interne de l'API
  (`API_UPSTREAM_URL`) est injecte au demarrage du conteneur (`envsubst`), pas fige a la
  construction de l'image.
- `docker-compose.prod.yml` : assemble `db` (PostGIS) + `api` + `web`. Seul `web` expose un port.

## Variables d'environnement a fournir

Secrets a generer (jamais les valeurs de `.env.example`, qui sont pour le developpement local
uniquement) :

| Variable | Comment l'obtenir |
|---|---|
| `POSTGRES_PASSWORD` | mot de passe fort quelconque |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
| `AUDIT_ED25519_PRIVATE_KEY` / `AUDIT_ED25519_PUBLIC_KEY` | a generer une seule fois puis conserver durablement (paire de signature du registre d'audit ; si regeneree, l'historique existant ne se verifie plus) |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey (chatbot inoperant sans elle, degrade proprement) |
| `RESEND_API_KEY` | https://resend.com/api-keys (codes OTP non envoyes par e-mail sans elle, journalises en repli) |
| `RESEND_FROM_EMAIL` | adresse `nom@domaine-verifie` — le domaine doit etre verifie dans Resend (Domains > Add Domain, enregistrements DNS SPF/DKIM) |
| `WEB_ORIGIN` | l'URL publique finale du site (ex. `https://ayinon.mondomaine.bj`) |

## Etapes cote Coolify

1. Nouveau projet Coolify, pointer sur ce depot Git, branche `main`.
2. Type de ressource : **Docker Compose**, fichier `docker-compose.prod.yml`.
3. Renseigner les variables d'environnement ci-dessus dans l'onglet "Environment Variables" de
   Coolify (jamais commit dans le repo).
4. Assigner le domaine public au service `web` uniquement.
5. Premier deploiement : `prisma migrate deploy` s'execute automatiquement au demarrage du
   conteneur `api` (voir `CMD` du Dockerfile) — aucune etape manuelle de migration necessaire.
6. Executer le seed une seule fois si souhaite (donnees de demonstration) : ouvrir un terminal
   Coolify sur le conteneur `api` puis `pnpm run seed`.
