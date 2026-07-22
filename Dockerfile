FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN apk upgrade --no-cache && corepack enable

# ---- installer: full dependency tree for the build ----
FROM base AS installer
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

# ---- builder: compile TypeScript ----
FROM installer AS builder
WORKDIR /app
COPY tsconfig.json tsconfig.build.json ./
COPY index.js ./
COPY src ./src/
RUN pnpm build

# ---- runner: lean production image ----
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# chown here while /app and /pnpm are still empty is cheap. Doing a single
# `chown -R /app` at the end instead would force a full copy-up of every file
# already written into earlier layers (node_modules included), roughly
# doubling the image size for no benefit.
RUN mkdir -p /pnpm && chown node:node /app /pnpm
USER node

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --chown=node:node prisma ./prisma/
# The `prisma` CLI is a devDependency (only @prisma/client ships to production
# per Prisma's own convention), but `prisma migrate deploy`/`generate` must run
# in this container at start-up. Trim the in-image package.json down to just
# that one devDependency (the tracked repo file is untouched) before a second,
# non-frozen install, so pnpm links in the pinned `prisma` CLI from the lockfile
# without pulling in vitest/oxlint/typescript/tsx/@faker-js alongside it.
# Everything runs in a single layer so `pnpm store prune` actually shrinks the
# image instead of leaving the earlier install's store cache sitting in a
# lower layer that a later layer can only hide, not remove.
RUN pnpm install --frozen-lockfile --prod \
    && node -e "\
    const fs = require('fs'); \
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
    pkg.devDependencies = { prisma: pkg.devDependencies.prisma }; \
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
    " \
    && pnpm install --frozen-lockfile=false \
    && pnpm exec prisma generate \
    && pnpm store prune

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node assets ./assets

EXPOSE 8080

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
