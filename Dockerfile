# ---- dependencies ----
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

# Prisma client
RUN pnpm prisma generate

# Build Next.js app
RUN pnpm build

# Runtime copies
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
RUN ["pnpm",  "start"]