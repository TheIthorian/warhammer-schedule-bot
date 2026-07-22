# Railway Migration + Toolchain Modernisation

**Date:** 2026-07-22
**Status:** Approved

## Goal

Move `warhammer-schedule-bot` (a Discord bot) off DigitalOcean App Platform onto Railway, clear all dependency
vulnerabilities, and bring the repo's tooling in line with the standards used in `centralised-task-manager` (ctm).

## Current State

| Area          | Today                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Hosting       | DigitalOcean App Platform, deploying `theithorian/gm-sidekick:latest`     |
| CI            | `.github/workflows/deploy.yml` builds + pushes to Docker Hub on `master`  |
| Database      | Postgres via Prisma 6.19 (migrations exist, schema is Postgres-only)      |
| Prod runtime  | `ts-node index.js` with full `devDependencies` installed in the image     |
| Package mgr   | npm                                                                       |
| Tests         | jest + ts-jest + babel-jest, tests in `__test__` / `__tests__` dirs       |
| Lint / format | eslint (`next/core-web-vitals`) + prettier                                |
| Vulns         | 25 advisories (17 high), nearly all via `discord.js` → `undici` / `ws`    |

Dead weight found in `package.json`:

- `tsc@2.0.4` — a squatted package, **not** the TypeScript compiler. It installs a `tsc` binary that shadows the real
  one and prints "This is not the tsc command you are looking for". Any `npx tsc` in this repo silently does nothing
  and exits 0. Actively harmful.
- `babel@6` — the 2015-era meta-package, unused.
- `@types/moment`, `@types/pino` — both libraries ship their own types.
- `eslint-config-next` — this is not a Next.js app.

## Decisions

### 1. Railway

- Railway project with two services: **app** (deployed from the GitHub repo, Dockerfile builder) and **Postgres**
  (Railway managed plugin).
- `DATABASE_URL` set as a reference variable `${{Postgres.DATABASE_URL}}` so traffic stays on Railway's private
  network.
- Remaining secrets set as Railway service variables: `BOT_TOKEN`, `APPLICATION_ID`, `PUBLIC_KEY`, `CLIENT_ID`,
  `CLIENT_SECRET`, `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, `ADMIN_USERS`.
- `railway.json` committed at the repo root: `DOCKERFILE` builder, healthcheck path `/`, restart policy `ON_FAILURE`.
- **The Railway database starts empty.** App data (scheduling, bookings) is ephemeral and can be recreated, so
  nothing is migrated from DigitalOcean. `migrate deploy` builds the schema from scratch on first boot.
- Deploys trigger on push to `master` — Railway watches the repo directly. No container registry in the loop.

**Files deleted:** `.github/workflows/deploy.yml`, `app.yaml`, `app.prod.yaml.example`, `.gcloudignore`,
`healthcheck.sh` (Railway performs an HTTP healthcheck; the current script only greps the process table).

**Code change:** `src/app.ts` reads the port as `process.env.PORT ?? process.env.HEALTH_PORT ?? 8080`. Railway
injects `PORT` and routes to it.

### 2. pnpm

- `pnpm-lock.yaml` replaces `package-lock.json`.
- `.npmrc` matching ctm: `shamefully-hoist=false`, `strict-peer-dependencies=false`, `engine-strict=true`.
- `.nvmrc` pinned to `24.4.0`.
- `package.json` gains `engines` (`node >=24.0.0`, `pnpm >=9.0.0`) and `packageManager`.

Single package — no workspace, no Turborepo. The ctm monorepo machinery does not apply here.

### 3. Style and config, matching ctm

- **oxlint + oxfmt** replace eslint + prettier. `oxlint.json` and `.oxfmtrc.json` copied from ctm (tabWidth 4,
  singleQuote, printWidth 120, trailingComma all). Delete `.eslintrc.json`, `prettier.config.cjs`, `.prettierignore`.
- **tsconfig** rewritten against ctm's `packages/tsconfig/base.json`: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`, `declaration`, `sourceMap`. The current 300-line commented-out default
  file goes.
  - Measured cost: **16 errors** under `--strict`, **18** with the unused/return checks, against the current file
    graph. The existing config uses `files: ["src/app.ts"]`, so widening to `include: ["src"]` may surface more.
    These get fixed as part of the work, not suppressed.
- `tsconfig.build.json` emits to `dist/` and excludes test files.
- **Exact pinned versions** — no `^` ranges, matching ctm.
- **CLAUDE.md** added, documenting stack, commands, and conventions.
- **Conventional Commits** for all commit messages.

### 4. Testing: jest → vitest

Jest here requires ts-jest *and* babel-jest — the same babel packages being purged in the dependency cleanup. Vitest
uses Vite's esbuild transform, so TypeScript works with no transform config and no babel at all.

Removes: `@babel/core`, `@babel/preset-env`, `babel-jest`, `babel@6`, `ts-jest`, `jest`, `@types/jest`, `.babelrc`,
`jest.config.ts`.

**Deviation from ctm:** ctm co-locates `*.spec.ts` next to source. This repo has 10 test files in `__test__` /
`__tests__` directories, two of which are `.js`, plus snapshot files. Moving them is churn unrelated to the goal, so
test files stay where they are; `vitest.config.ts` points at `src/**/__test*__/**/*.test.{ts,js}`. Co-location can
happen later as its own change.

Tests already require a real Postgres (`npm test` sets a `DATABASE_URL` pointing at localhost:5432), which matches
ctm's "integration tests use the real DB" rule. `docker compose up db` provides it; the test script is rewritten to
stop deleting a SQLite file that no longer exists.

### 5. Dependencies

Bump to clear all advisories:

- `discord.js` → latest 14.x (resolves the `undici` and `ws` chains — 20 of the 25 advisories)
- `prisma` / `@prisma/client` / `@prisma/adapter-pg` → latest 6.x, kept in lockstep
- `pino` / `pino-pretty` → latest

Remove: `tsc`, `babel`, `@types/moment`, `@types/pino`, `eslint-config-next`, `eslint`, `prettier`, `jest`,
`ts-jest`, `babel-jest`, `@babel/*`, `@types/jest`.

Move to `devDependencies`: `ts-node` (dev entry point only; prod runs compiled JS).

**Exit criterion:** `pnpm audit` reports zero vulnerabilities.

### 6. Dockerfile

Multi-stage, following ctm's base → installer → builder → runner shape, minus the Turborepo prune stages:

```
base      node:24-alpine, apk upgrade, corepack enable
installer pnpm install --frozen-lockfile, prisma generate
builder   pnpm build  (tsc -p tsconfig.build.json → dist/)
runner    node:24-alpine, NODE_ENV=production, prod deps + dist/ + prisma/ + generated client + assets/
```

- Runs as the non-root `node` user.
- `CMD` runs `prisma migrate deploy` then `node dist/index.js`. Migrations at boot are safe here — single instance,
  no concurrent deploys.
- Build stays `tsc`, not Vite. Vite bundles for browsers; this is a long-running Node service, and Prisma's client
  plus `node-schedule` do runtime resolution that bundlers mishandle. ctm uses `tsc -p tsconfig.build.json` for the
  same reason.

### 7. Local development

- `docker-compose.yml` keeps the `db` service; `depends_on: db` is uncommented on `app` now that the remote-Neon
  comments are obsolete.
- `README.MD` rewritten: Railway replaces the DigitalOcean deploy section, pnpm replaces npm, and the stale
  `DATABASE_URL="file:./dev.db"` SQLite examples are corrected to Postgres.
- `prisma/dev.db` (a stale 57k SQLite file from 2023) and the committed `.DS_Store` are deleted.

## Out of Scope

- **`moment` → `date-fns` / Temporal.** `moment` is in maintenance mode, but replacing it touches scheduling logic
  and deserves its own change with its own test pass.
- **Co-locating test files** as `*.spec.ts` — see the deviation note in section 4.
- **The OAuth flow in `src/oauth/`** — untouched.

## Risks

| Risk                                                                | Mitigation                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `discord.js` minor bump changes API surface                          | Full test run plus a manual smoke test of `/schedule` before cutover    |
| Strict TypeScript surfaces more than 18 errors once `include` widens | Fix them; if the count is unexpectedly large, split into its own commit |
| Vitest snapshot format differs from jest                             | Regenerate snapshots, review the diff rather than accepting blind       |
| Migration history has four `_init` migrations                        | Verify `migrate deploy` applies cleanly against a fresh Railway DB      |

## Verification

1. `pnpm audit` → zero vulnerabilities
2. `pnpm lint` and `pnpm format --check` → clean
3. `pnpm build` → `dist/` produced, no type errors
4. `pnpm test` → all suites pass against local Postgres
5. `docker compose up` → app boots, health endpoint returns 200
6. Railway deploy succeeds; bot comes online in Discord and `/ping` responds
7. DigitalOcean app and Docker Hub repo torn down only after step 6 passes
