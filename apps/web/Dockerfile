# Contexte de build = racine du monorepo (voir docs/deploiement.md, meme raison que apps/api/Dockerfile).
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ayinon/shared build
RUN pnpm --filter @ayinon/web build

FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache gettext
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/nginx.conf.template
COPY apps/web/docker-entrypoint.sh /docker-entrypoint-ayinon.sh
RUN chmod +x /docker-entrypoint-ayinon.sh
# Adresse interne (reseau Docker/Coolify) de l'API — jamais l'URL publique : le navigateur ne
# parle qu'a ce conteneur nginx, qui relaie /api/* en interne (voir services/api.ts : BASE_URL="/api").
ENV API_UPSTREAM_URL=http://api:3000
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint-ayinon.sh"]
