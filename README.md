# AYINON — Le Gardien Numerique de la Terre

Plateforme de securisation, verification et gouvernance fonciere pour la Republique du Benin, alignee sur le
programme gouvernemental « Plus Loin, Ensemble » (territorialisation en 6 poles, democratisation du titre
foncier, paix sociale).

Documentation complementaire :

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture globale, schema de donnees, choix techniques
- [docs/SECURITE.md](docs/SECURITE.md) — modele RBAC, chaine d'audit cryptographique, gestion des cles
- [docs/DEMO.md](docs/DEMO.md) — scenario de demonstration live en 3 minutes

## Stack

- **Backend** : NestJS (TypeScript) + PostgreSQL/PostGIS + Prisma, validation Zod, JWT en cookies `HttpOnly`
- **Frontend** : Vue 3 + Vite, Pinia, MapLibre-GL, Dexie (IndexedDB), PWA offline-first
- **Cryptographie** : SHA-256 + Ed25519 natifs (module `node:crypto`, aucune dependance externe)
- **Monorepo** : pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`)

## Prerequis

- Node.js ≥ 20, pnpm ≥ 9
- Docker Desktop (pour PostgreSQL/PostGIS)

## Demarrage

```bash
cp .env.example .env
cp .env.example apps/api/.env   # Prisma CLI lit son .env dans apps/api

pnpm install
pnpm build:shared               # compile @ayinon/shared (necessaire avant api/web)

pnpm db:up                      # demarre PostgreSQL/PostGIS via Docker
pnpm --filter @ayinon/api exec prisma migrate deploy
pnpm seed                       # jeu de donnees de demonstration (voir comptes ci-dessous)

pnpm dev:api                    # http://localhost:3000/api
pnpm dev:web                    # http://localhost:5173 (proxy /api -> :3000)
```

Tests backend (chaine d'audit cryptographique + detection de chevauchement PostGIS) :

```bash
pnpm test:api
```

## Comptes de demonstration

Mot de passe commun : `Ayinon@2026`

| Email | Role |
|---|---|
| citoyen1@ayinon.bj | Citoyen (proprietaire, Cotonou) |
| diaspora1@ayinon.bj | Citoyen (diaspora) |
| geometre1@ayinon.bj | Geometre-expert (OGEB) |
| mandataire.aine@ayinon.bj | Mandataire familial — Aine |
| mandataire.femmes@ayinon.bj | Mandataire familial — Representante des femmes |
| mandataire.cadet@ayinon.bj | Mandataire familial — Cadet |
| andf.littoral@ayinon.bj | Agent ANDF (Pole Littoral-Atlantique) |
| csaf1@ayinon.bj | Magistrat CSAF |
| admin@ayinon.bj | Administrateur plateforme |

## Perimetre de cette version

Code fonctionnel de bout en bout pour 4 piliers : **Citoyens** (recherche NUP, scanner anti-fraude, passeport
foncier, simulateur de frais), **Geometres** (import de bornage + detection de chevauchement PostGIS),
**Collectivites familiales** (multi-signature + affichage de ban de 15 jours) et **Etat/ANDF + CSAF** (console
de pilotage par pole, gel conservatoire judiciaire). Notaires et module Diaspora avance sont documentes dans
l'architecture (modele de donnees pret) mais sans dashboard dedie — voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
