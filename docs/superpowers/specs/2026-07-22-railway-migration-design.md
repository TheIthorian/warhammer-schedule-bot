# Railway Migration + Toolchain Modernisation

**Date:** 2026-07-22
**Status:** Approved

## Goal

Move `warhammer-schedule-bot` (a Discord bot) off DigitalOcean App Platform onto Railway, clear all dependency
vulnerabilities, and bring the repo's tooling in line with the standards used in `centralised-task-manager` (ctm).

## Current State

| Area          | Today                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Hosting       | DigitalOcean App Platform, deploying `theithorian/gm-sidekick:latest`    |
| CI            | `.github/workflows/deploy.yml` builds + pushes to Docker Hub on `master` |
| Database      | **Nominally** Postgres via Prisma 6.19 — in practice still SQLite (see below) |
| Prod runtime  | `ts-node index.js` with full `devDependencies` installed in the image    |
| Package mgr   | npm                                                                      |
| Tests         | jest + ts-jest + babel-jest, tests in `__test__` / `__tests__` dirs      |
| Lint / format | eslint (`next/core-web-vitals`) + prettier                               |
| Vulns         | 25 advisories (17 high), nearly all via `discord.js` → `undici` / `ws`   |

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

Jest here requires ts-jest _and_ babel-jest — the same babel packages being purged in the dependency cleanup. Vitest
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

### 5. Migration history reset

The existing migration history is broken and cannot be deployed as-is:

- `prisma/migrations/migration_lock.toml` records `provider = "sqlite"` while `schema.prisma` declares
  `postgresql`. Prisma aborts on this mismatch.
- `prisma/migrations/20260131154044_init/` is empty — it contains no `migration.sql`.
- Two of the older migrations contain `AUTOINCREMENT`, which is SQLite syntax.

Because the database is being recreated empty, all four `_init` migrations are deleted and replaced with a single
fresh Postgres migration generated from the current `schema.prisma`, with `migration_lock.toml` recording
`postgresql`.

**SQLite is not retained for local or test use.** It was considered and rejected:

- Prisma supports one provider per datasource; `migration_lock.toml` pins it. Supporting both means two migration
  histories maintained by hand, which will drift.
- `@prisma/adapter-pg` is a Postgres driver adapter, so tests on SQLite would exercise a different code path than
  production.
- SQLite has no native `DateTime` type — dates are stored as integers or strings with different timezone and
  comparison semantics. This is a scheduling bot: `scheduledDate`, `answeredDate`, and reminder windows are the core
  domain. SQLite-backed tests could pass while production misfires, which is the worst available failure mode.

Postgres runs everywhere. `docker compose up db` provides it locally and for tests.

### 6. Dependencies

Bump to clear all advisories:

- `discord.js` → `14.27.0` (resolves the `undici` and `ws` chains — 20 of the 25 advisories)
- `prisma` / `@prisma/client` / `@prisma/adapter-pg` → `6.19.3` first, then `7.9.0` as a separate final step (see
  below), kept in lockstep
- `pino` → `10.3.1`, `pino-pretty` → `13.1.3`
- `typescript` → `6.0.3`, matching ctm

Full pinned set is listed in Task 2 of the implementation plan.

Remove: `tsc`, `babel`, `@types/moment`, `@types/pino`, `eslint-config-next`, `eslint`, `prettier`, `jest`,
`ts-jest`, `babel-jest`, `@babel/*`, `@types/jest`.

Move to `devDependencies`: `ts-node` (dev entry point only; prod runs compiled JS).

**Exit criterion:** `pnpm audit` reports zero vulnerabilities.

### 6a. Prisma 7 and the ESM conversion

Prisma 7 lands **last**, after the Railway deployment is verified working on 6.19.3, as an isolated commit that can be
reverted without disturbing the migration.

It is not a version bump. Prisma 7 requires:

- `"type": "module"` — the project becomes ESM
- the `prisma-client-js` generator replaced by `prisma-client`, with a mandatory `output` path
- the client imported from that output path rather than `@prisma/client`
- `prisma.config.ts` replacing schema-embedded CLI configuration
- explicit `dotenv` loading; environment variables no longer load automatically
- a driver adapter for all databases

Three of those are already satisfied here: `@prisma/adapter-pg` is in use, there are no `require()` calls, and only
two files import `@prisma/client`. The cost is the ESM conversion itself — **130 extensionless relative imports
across 43 files** must gain explicit `.js` extensions. That is mechanical, scriptable, and fully verified by `tsc`,
but it touches nearly every source file, which is why it is sequenced last.

### 7. Dockerfile

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

### 8. Local development

- `docker-compose.yml` keeps the `db` service; `depends_on: db` is uncommented on `app` now that the remote-Neon
  comments are obsolete.
- **Host bind mounts replace named volumes.** The `postgres-data` named volume becomes a bind mount to
  `./.data/postgres`, so the database files are visible on the host and survive `docker compose down -v`. `.data/` is
  gitignored. The `volumes:` top-level block is removed.
- `README.MD` rewritten: Railway replaces the DigitalOcean deploy section, pnpm replaces npm, and the stale
  `DATABASE_URL="file:./dev.db"` SQLite examples are corrected to Postgres.
- `prisma/dev.db` (a stale 57k SQLite file from 2023) and the committed `.DS_Store` are deleted.

## Out of Scope

- **`moment` → `date-fns` / Temporal.** `moment` is in maintenance mode, but replacing it touches scheduling logic
  and deserves its own change with its own test pass.
- **Co-locating test files** as `*.spec.ts` — see the deviation note in section 4.
- **The OAuth flow in `src/oauth/`** — untouched.

## Risks

| Risk                                                                 | Mitigation                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
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

## Correction: the Postgres migration was never completed

Discovered during Task 5, after this spec was approved. The "Current State" table above originally recorded the
project as running on Postgres. That was wrong, and the error came from reading `schema.prisma` (which does declare
`postgresql`) without checking whether anything downstream agreed.

Three pieces of evidence, all found during implementation:

- `prisma/migrations/migration_lock.toml` recorded `provider = "sqlite"`.
- Two migrations contained `AUTOINCREMENT`, which is SQLite-only.
- `src/services/poll.service.ts` contains three raw SQL queries written against SQLite's case-insensitive
  identifiers. Postgres folds unquoted identifiers to lowercase while Prisma creates them case-preserved, so every
  one of these queries fails. `getInProgressPoll` and `closePoll` — behind `/schedule` and `/book` — have never run
  successfully on Postgres.

`pg` was also missing from `dependencies` despite `src/primsaClient.ts` importing `Pool` from it. It resolved only
transitively, which pnpm's strict layout does not permit — the container would have crashed on boot.

This work is therefore not "move a working Postgres app to Railway". It is "finish the abandoned Postgres migration,
then move it". Task 6a in the implementation plan covers porting the raw SQL to Prisma's query builder.

## Accepted Tradeoffs (recorded during implementation)

**Scheduled messages to a missing channel are not retried.** `ScheduledMessageProcessor.processMessage` guards a
null or non-text-based channel by logging at `error` and returning. Because the caller then marks the message
`processed`, this bypasses the `processFailedMessage` retry ladder that a thrown error would have triggered — a
transient Discord fetch failure loses the reminder rather than retrying it up to three times.

Reviewed and accepted: a message to a deleted channel is genuinely undeliverable, and retrying it three times is
wasted work and log noise. The failure is logged with the message id and channel id, so it is visible rather than
silent.
