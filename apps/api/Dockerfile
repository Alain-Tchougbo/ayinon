# Contexte de build = racine du monorepo (necessaire pour pnpm workspaces : pnpm-lock.yaml,
# pnpm-workspace.yaml et packages/shared doivent etre visibles). Voir docs/deploiement.md.
FROM node:20-bookworm-slim AS base
# Prisma a besoin d'OpenSSL pour detecter la bonne version de moteur de requete — absent de
# l'image slim par defaut.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @ayinon/api exec prisma generate
RUN pnpm --filter @ayinon/shared build
RUN pnpm --filter @ayinon/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/node_modules /repo/apps/api/node_modules
COPY --from=build /repo/packages/shared/dist /repo/packages/shared/dist
COPY --from=build /repo/apps/api/dist /repo/apps/api/dist
COPY --from=build /repo/apps/api/prisma /repo/apps/api/prisma
COPY apps/api/package.json apps/api/package.json
WORKDIR /repo/apps/api
EXPOSE 3000
# prisma migrate deploy applique les migrations en attente puis demarre l'API ; jamais
# `migrate dev` (interactif, deconseille en production).
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/src/main.js"]
