# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Configure SSL
RUN apt-get update -y && apt-get install -y openssl

# Prisma client
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm prisma generate

# Build Next.js
RUN pnpm build

# Build domain enrichment worker + link enrichmentworker (transpile TS to JS)
RUN pnpm build:workers

# ---- run (web runtime, standalone) ----
FROM node:20-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]

# ---- worker-run (worker runtime, full deps, no pnpm) ----
FROM node:20-bookworm-slim AS worker-run
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
RUN node -e "require('fs').writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }))"

# dacă worker-ele folosesc prisma schema/config la runtime
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# ---- migrate (job image) ----
FROM node:20-bookworm-slim AS migrate
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

CMD ["pnpm", "prisma", "migrate", "deploy"]