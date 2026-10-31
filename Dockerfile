# The search shell as a standalone Next server for the VM (gurmukhi-kosh
# selfhost/docker-compose.apps.yml). Built for arm64 by .github/workflows/deploy.yml and pushed to
# ghcr.io/thehimmat/gurmukhi-search.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Inlined at build time. The anon key is public (it ships to browsers); the server reads
# SUPABASE_URL and SUPABASE_ANON_KEY at runtime first (lib/supabase.ts). Rewrites are fixed at
# build time too, so the kosh zone is the kosh container on the same Docker network.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG KOSH_ZONE_URL=http://kosh:3000
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
