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
# `prisma` lives in `dependencies`, not `devDependencies`, even though Prisma's
# own convention says the CLI is dev-only (only @prisma/client ships to
# production). That convention assumes migrations run from CI or a developer
# machine; here the container runs `prisma migrate deploy` itself at every
# boot, so the CLI is a genuine runtime dependency. Keeping it there lets a
# single frozen, --prod install pull in exactly what's needed.
# --no-optional matters here: `typescript` is an optional peer of prisma/
# @prisma-client (used only to type its generated client), and it stays a
# devDependency of this project. Under `--frozen-lockfile --prod` alone, pnpm
# still materializes that optional peer in full (a ~24MB package) because the
# lockfile's peer-resolution key for `prisma` was baked in when the top-level
# lockfile was generated with devDependencies present. `--no-optional` is what
# actually excludes it from this install; without it typescript ships despite
# being "prod"-filtered out.
RUN pnpm install --frozen-lockfile --prod --no-optional && pnpm exec prisma generate && pnpm store prune

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node assets ./assets

EXPOSE 8080

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
