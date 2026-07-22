# Railway Migration + Toolchain Modernisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the bot off DigitalOcean onto Railway with a Postgres plugin, clear all 25 dependency advisories, and bring tooling in line with the `centralised-task-manager` (ctm) standards.

**Architecture:** Single-package Node service (no monorepo). pnpm for dependencies, tsc for the production build, vitest for tests, oxlint/oxfmt for style. A multi-stage Alpine Dockerfile produces a lean runtime image that Railway builds directly from the GitHub repo. Prisma migrations run at container boot against a Railway-managed Postgres.

**Tech Stack:** Node 24 · pnpm 11 · TypeScript 6 · Prisma 6 (Postgres) · discord.js 14 · vitest · oxlint + oxfmt · Docker (Alpine, multi-stage) · Railway

**Spec:** `docs/superpowers/specs/2026-07-22-railway-migration-design.md`

## Global Constraints

- **Node** `>=24.0.0`. `.nvmrc` pins `24.4.0`. Docker images use `node:24-alpine`.
- **pnpm** `>=9.0.0`, `packageManager` field set to `pnpm@11.1.3`.
- **Exact versions only.** No `^` or `~` ranges anywhere in `package.json`.
- **Formatting:** tab width 4, single quotes, print width 120, trailing commas on all multi-line constructs.
- **Database is Postgres everywhere** — production, local development, and tests. No SQLite.
- **Commits follow Conventional Commits:** `<type>(<scope>): <description>`, types `feat|fix|chore|test|docs|refactor|style|perf|build|ci`. The scope is **optional**, matching ctm's convention.
- **Never use `any`.** Where a type is not statically known, use a runtime type guard rather than a cast.
- **Explicit return types** on every exported function.
- **Do not commit secrets.** `.env` and `.docker.env` stay gitignored.
- Every task ends with a commit. Do not batch commits across tasks.

---

## File Structure

**Created:**

- `.npmrc` — pnpm settings
- `.nvmrc` — Node version pin
- `oxlint.json` — lint rules
- `.oxfmtrc.json` — format rules
- `vitest.config.ts` — test runner config
- `tsconfig.build.json` — production build config (replaces the existing stub)
- `railway.json` — Railway service config
- `CLAUDE.md` — repo conventions
- `prisma/migrations/<timestamp>_init/migration.sql` — single squashed Postgres migration

**Modified:**

- `package.json` — deps, scripts, engines
- `tsconfig.json` — strict config
- `Dockerfile` — multi-stage
- `docker-compose.yml` — bind mounts, `depends_on`
- `.gitignore`, `.dockerignore`
- `README.MD`
- `src/app.ts` and 8 other source files — strict-mode fixes

**Deleted:**

- `.github/workflows/deploy.yml`, `app.yaml`, `app.prod.yaml.example`, `.gcloudignore`, `healthcheck.sh`
- `.babelrc`, `jest.config.ts`, `.eslintrc.json`, `prettier.config.cjs`, `.prettierignore`
- `package-lock.json`, `prisma/dev.db`, `.DS_Store`
- `prisma/migrations/2023*`, `prisma/migrations/20260131154044_init`

---

## Task 1: Switch to pnpm

**Files:**

- Create: `.npmrc`, `.nvmrc`
- Modify: `package.json`, `.gitignore`
- Delete: `package-lock.json`, `.DS_Store`

**Interfaces:**

- Consumes: nothing (first task)
- Produces: a working `pnpm install`; every later task uses `pnpm` rather than `npm`

- [ ] **Step 1: Delete the npm lockfile and stray files**

```bash
rm -f package-lock.json .DS_Store
```

- [ ] **Step 2: Create `.npmrc`**

```
shamefully-hoist=false
strict-peer-dependencies=false
engine-strict=true
```

- [ ] **Step 3: Create `.nvmrc`**

```
24.4.0
```

- [ ] **Step 4: Add `engines` and `packageManager` to `package.json`**

Insert these two blocks after the `"homepage"` field:

```json
    "engines": {
        "node": ">=24.0.0",
        "pnpm": ">=9.0.0"
    },
    "packageManager": "pnpm@11.1.3",
```

- [ ] **Step 5: Add `.DS_Store` to `.gitignore`**

Append to `.gitignore`:

```
.DS_Store
.data/
dist/
```

Then remove the now-stale `build` line (the build output directory is `dist/` from Task 5 onward).

- [ ] **Step 6: Install with pnpm**

Run: `pnpm install`
Expected: `pnpm-lock.yaml` is created. Warnings about deprecated packages are expected at this stage — Task 2 removes them.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "build: switch from npm to pnpm

Adds .npmrc, .nvmrc, engines and packageManager fields. Replaces
package-lock.json with pnpm-lock.yaml."
```

---

## Task 2: Clear dependency vulnerabilities and remove dead packages

**Files:**

- Modify: `package.json`
- Delete: `.babelrc`

**Interfaces:**

- Consumes: pnpm from Task 1
- Produces: a clean dependency tree. `pnpm audit` reports zero vulnerabilities. `node_modules/.bin/tsc` is the real TypeScript compiler.

**Context:** `tsc@2.0.4` is a squatted package that installs a fake `tsc` binary shadowing the real one. Removing it is what makes `pnpm exec tsc` work at all. `babel@6` is the 2015 meta-package. `@types/moment` and `@types/pino` are stubs — both libraries ship their own types.

- [ ] **Step 1: Record the current advisory count**

Run: `pnpm audit 2>&1 | tail -5`
Expected: reports vulnerabilities (25 under npm; the pnpm count may differ slightly). Note the number.

- [ ] **Step 2: Remove dead and replaced packages**

```bash
pnpm remove tsc babel @types/moment @types/pino eslint eslint-config-next \
  prettier jest @types/jest ts-jest babel-jest @babel/core @babel/preset-env
rm -f .babelrc
```

- [ ] **Step 3: Replace the dependency blocks in `package.json`**

The `dependencies` and `devDependencies` blocks become exactly:

```json
    "dependencies": {
        "@prisma/adapter-pg": "6.19.3",
        "@prisma/client": "6.19.3",
        "discord.js": "14.27.0",
        "dotenv": "17.4.2",
        "moment": "2.30.1",
        "node-schedule": "2.1.1",
        "pino": "10.3.1",
        "pino-pretty": "13.1.3"
    },
    "devDependencies": {
        "@faker-js/faker": "10.5.0",
        "@types/node": "24.13.3",
        "@types/node-schedule": "2.1.3",
        "@types/pg": "8.15.6",
        "oxfmt": "0.59.0",
        "oxlint": "1.74.0",
        "prisma": "6.19.3",
        "tsx": "4.23.1",
        "typescript": "6.0.3",
        "vitest": "4.1.10"
    }
```

Note what moved: `pino-pretty` stays a runtime dependency (the `dev` script pipes through it). `ts-node` is gone entirely — `tsx` replaces it for the dev entry point and the two scripts in `src/scripts/`.

**On version choice:** every pin above is at least a week old. pnpm 11 defaults `minimumReleaseAge` to 24 hours as a supply-chain defense, and packages inside that window will be refused. Do not add a `minimumReleaseAgeExclude` to get around it — pick the newest release that is already outside the window instead. `oxlint@1.74.0` and `oxfmt@0.59.0` are chosen for exactly this reason.

- [ ] **Step 3a: Create `pnpm-workspace.yaml`**

pnpm 11 requires explicit approval for packages with install scripts, or `pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`:

```yaml
allowBuilds:
    '@prisma/client': true
    '@prisma/engines': true
    esbuild: true
    prisma: true
    unrs-resolver: true
```

This file exists from Task 2 onward — later tasks should not be surprised by it.

- [ ] **Step 4: Reinstall**

Run: `pnpm install`
Expected: completes without peer-dependency errors.

- [ ] **Step 5: Verify the advisories are gone**

Run: `pnpm audit`
Expected: `No known vulnerabilities found`

If any remain, report which package and advisory before continuing — do not suppress with overrides without checking whether a newer version fixes it.

- [ ] **Step 6: Verify the real tsc is now on PATH**

Run: `pnpm exec tsc --version`
Expected: `Version 6.0.3` — **not** "This is not the tsc command you are looking for".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(deps): clear all dependency advisories

Bumps discord.js to 14.27.0, which resolves the undici and ws advisory
chains. Removes tsc@2.0.4, a squatted package whose fake binary shadowed
the real TypeScript compiler, along with the unused babel@6 meta-package
and two stub @types packages. Replaces ts-node with tsx."
```

---

## Task 3: Replace eslint and prettier with oxlint and oxfmt

**Files:**

- Create: `oxlint.json`, `.oxfmtrc.json`
- Modify: `package.json` (scripts)
- Delete: `.eslintrc.json`, `prettier.config.cjs`, `.prettierignore`

**Interfaces:**

- Consumes: oxlint and oxfmt from Task 2
- Produces: `pnpm lint` and `pnpm format` scripts used by every later task's verification

- [ ] **Step 1: Delete the old config files**

```bash
rm -f .eslintrc.json prettier.config.cjs .prettierignore
```

- [ ] **Step 2: Create `oxlint.json`**

```json
{
    "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
    "rules": {
        "no-console": "warn",
        "eqeqeq": "error",
        "no-var": "error",
        "prefer-const": "error"
    },
    "ignorePatterns": ["dist/**", "node_modules/**", "*.d.ts"]
}
```

- [ ] **Step 3: Create `.oxfmtrc.json`**

```json
{
    "$schema": "./node_modules/oxfmt/configuration_schema.json",
    "tabWidth": 4,
    "singleQuote": true,
    "printWidth": 120,
    "trailingComma": "all",
    "ignorePatterns": ["dist/**", "node_modules/**", "*.d.ts"]
}
```

- [ ] **Step 4: Replace the `scripts` block in `package.json`**

```json
    "scripts": {
        "build": "tsc -p tsconfig.build.json",
        "start": "node dist/index.js",
        "dev": "tsx watch index.js | pino-pretty",
        "test": "vitest run",
        "lint": "oxlint .",
        "format": "oxfmt --config .oxfmtrc.json .",
        "db:migrate": "prisma migrate dev",
        "db:deploy": "prisma migrate deploy",
        "db:generate": "prisma generate",
        "deploy-commands": "tsx src/scripts/register-commands.ts",
        "invite-link": "tsx src/scripts/invite.ts"
    },
```

The old `prettier`, `build_`, `test:dropdb`, `database:init`, and `database:init:test` scripts are all removed. `test:dropdb` deleted a SQLite file that no longer exists.

- [ ] **Step 5: Format the whole repo**

Run: `pnpm format`
Expected: roughly 35 files rewritten.

The diff will **not** be whitespace-only. oxfmt matches the old prettier config on tabWidth, singleQuote, and printWidth, but the old config also set `arrowParens: 'avoid'` and oxfmt follows the prettier-3 default of `always`. Expect three kinds of change repo-wide:

- trailing commas added to multi-line parameter and argument lists
- `x => ...` rewritten as `(x) => ...`
- constructor parameter lists split across lines

All three are semantically inert. Verify that with `git diff -w` — what survives whitespace-ignoring should be only the above. Anything else (a changed operator, string literal, argument order, or bracket placement) is a real change and must be investigated before committing.

- [ ] **Step 6: Run the linter**

Run: `pnpm lint`
Expected: passes, possibly with `no-console` warnings. Warnings are acceptable; errors are not. If `eqeqeq` or `no-var` errors appear, fix them — they are real.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: replace eslint and prettier with oxlint and oxfmt

Matches the toolchain used in centralised-task-manager. The old eslint
config extended next/core-web-vitals, which never applied to this
project."
```

---

## Task 4: Enable strict TypeScript and fix the resulting errors

**Files:**

- Modify: `tsconfig.json`, `src/app.ts`, `src/commands/book.ts`, `src/commands/query.ts`, `src/commands/roll.ts`, `src/commands/router.ts`, `src/message-interactions/router.ts`, `src/message-interactions/select-option.ts`, `src/scheduling/ascii-poll-results-formatter.ts`, `src/scheduling/schedule-service.ts`, `src/scheduling/scheduled-message-processor.ts`

**Interfaces:**

- Consumes: the real `tsc` from Task 2
- Produces: `pnpm exec tsc --noEmit` exits clean, which Task 5's build depends on

**Context:** The current `tsconfig.json` is the 300-line commented TypeScript default with `strict` off and `files: ["src/app.ts"]`. Widening to `include: ["src"]` may surface errors beyond the 18 listed below — fix those too.

- [ ] **Step 1: Replace `tsconfig.json` entirely**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "nodenext",
        "lib": ["ES2022"],
        "rootDir": ".",
        "outDir": "./dist",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "allowJs": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true
    },
    "include": ["src", "index.js"],
    "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Run the compiler to see the full error list**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL, roughly 18 errors. Record the list — it is the work queue for this task.

- [ ] **Step 3: Fix the unused declarations in `src/app.ts`**

Remove `PartialUser` from the import on line 1 — it is imported but never used:

```ts
import { Events } from 'discord.js';
```

Change the health server callback to drop the unused `req` parameter:

```ts
http.createServer((_req, res) => {
    log.debug('received health request');
    res.writeHead(200);
    res.end('ok');
}).listen(port);
```

- [ ] **Step 4: Fix the nullable `clientUser` in `src/app.ts`**

`client.user` is `User | null` — it is only non-null after the ready event, but the compiler cannot know that. Guard it explicitly rather than asserting:

```ts
client.on(Events.ClientReady, () => {
    const clientUser = client.user;

    if (!clientUser) {
        log.error('ClientReady fired without a client user');
        return;
    }

    log.info({ userId: clientUser.id }, `Client Ready - logged in as ${clientUser.tag}!`);
    config.discordBotUserId = clientUser.id;
});
```

- [ ] **Step 5: Fix the nullable `guildId` in `src/app.ts`**

Line 38 passes `interaction.guildId` (type `string | null`) where `string` is required. A null `guildId` means the interaction came from a DM, which this bot does not support. Skip those:

```ts
    client.on(Events.InteractionCreate, async interaction => {
        log.info('Events.InteractionCreate');

        const { guildId } = interaction;

        if (!guildId) {
            log.info('Ignoring interaction outside of a guild');
            return;
        }

        try {
            const { id: guildConnectionId } = await createGuildConnectionIfNeeded({
                guildId,
                userId: interaction.user.id,
                connectionUserUsername: interaction.user.username,
            });
```

The rest of the handler body is unchanged.

- [ ] **Step 6: Run the compiler to confirm `src/app.ts` is clean**

Run: `pnpm exec tsc --noEmit 2>&1 | grep 'src/app.ts'`
Expected: no output.

- [ ] **Step 7: Fix the remaining nullable-value errors**

Each of these follows the same shape — a Discord.js accessor returns `T | null` or `T | undefined` and the code assumes `T`. In every case, add an explicit guard that logs and returns early rather than a non-null assertion (`!`), so a genuine null surfaces in the logs instead of throwing at runtime.

The sites, from the compiler output:

| File                                            | Line   | Value                 | Why it can be null               |
| ----------------------------------------------- | ------ | --------------------- | -------------------------------- |
| `src/commands/book.ts`                          | 26     | `interaction.guildId` | DM interaction                   |
| `src/commands/query.ts`                         | 26     | option accessor       | option absent                    |
| `src/commands/roll.ts`                          | 24     | option accessor       | option absent                    |
| `src/message-interactions/select-option.ts`     | 66     | `interaction.guild`   | DM interaction                   |
| `src/scheduling/schedule-service.ts`            | 55, 76 | `channel`             | channel deleted or uncached      |
| `src/scheduling/schedule-service.ts`            | 91     | `thread`              | thread creation returned nothing |
| `src/scheduling/scheduled-message-processor.ts` | 71     | `channel`             | channel deleted or uncached      |

Pattern to apply at each channel site:

```ts
const channel = await client.channels.fetch(channelId);

if (!channel || !channel.isTextBased()) {
    log.error({ channelId }, 'Channel not found or is not text based');
    return;
}
```

For the command option sites, supply the documented default rather than returning — these are optional command options:

```ts
const diceInput = interaction.options.getString('dice') ?? undefined;
```

- [ ] **Step 8: Fix the index-signature error in `src/scheduling/ascii-poll-results-formatter.ts`**

Line 50 indexes an object literal typed as `{}` with a weekday name. Give the accumulator an explicit type instead of letting it widen:

```ts
type WeekdayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const counts: Partial<Record<WeekdayName, number>> = {};
```

Read the surrounding function before editing — the accumulator's real value type may not be `number`. Match what the code actually stores.

- [ ] **Step 9: Fix the router variance errors**

Two related errors, and unlike the rest these are genuine design problems, not missing guards.

`src/commands/router.ts:25` — `getHandler` returns `Handler | undefined` but the base class declares `Handler`. Widen the base class signature to admit `undefined`, then handle the undefined case at the call site in `src/interaction-router.ts`:

```ts
    abstract getHandler(interaction: Interaction): Handler | undefined;
```

`src/message-interactions/router.ts:30` — `MessageComponentInteractionHandler.execute` accepts a narrower interaction type than the base `Handler.execute` declares, which is unsound: the base type permits passing a `ChatInputCommandInteraction` that the implementation cannot handle. Make the router generic over its interaction type so each subclass declares what it accepts:

```ts
export abstract class InteractionRouter<TInteraction extends Interaction> {
    abstract getHandler(interaction: TInteraction): Handler<TInteraction> | undefined;
}
```

Read both router files fully before editing — the exact class and type names must match what is there.

- [ ] **Step 10: Verify the compiler is clean**

Run: `pnpm exec tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: enable strict TypeScript and fix resulting errors

Replaces the default commented tsconfig with the strict config used in
centralised-task-manager. Most fixes add explicit null guards around
Discord.js accessors that return nullable values. The two router changes
correct genuine variance unsoundness in the handler base classes."
```

---

## Task 5: Migrate jest to vitest

**Files:**

- Create: `vitest.config.ts`
- Modify: `package.json` (already done in Task 3), test files as needed
- Delete: `jest.config.ts`

**Interfaces:**

- Consumes: vitest from Task 2, strict types from Task 4
- Produces: `pnpm test` runs the suite; used as the gate in every later task

**Context:** There are 10 test files under `src/**/__test__/` and `src/**/__tests__/`, two of them `.js`, plus snapshot files. Per the spec, they stay where they are — this task changes the runner, not the layout.

- [ ] **Step 1: Start the local database**

Run: `docker compose up -d db`
Expected: `gm-sidekick-db` container is running. Tests need a real Postgres.

- [ ] **Step 2: Delete the jest config**

```bash
rm -f jest.config.ts
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/__test?(s)__/**/*.test.{ts,js}'],
        environment: 'node',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        pool: 'forks',
        fileParallelism: false,
    },
});
```

`fileParallelism: false` matters: these are integration tests sharing one database, so parallel files would race on the same tables.

**Do not write `poolOptions: { forks: { singleFork: true } }`** — that is the Vitest 2/3 spelling. Vitest 4 removed it, and an unknown key is ignored silently rather than erroring, so the suites would run in parallel against one database while appearing correctly configured.

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import { config } from 'dotenv';

config({ path: '.env.test' });

if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL is not set. Run `docker compose up -d db` and check .env.test');
}
```

- [ ] **Step 5: Create `.env.test`**

```
DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public"
NODE_ENV=test
```

Add `.env.test` to `.gitignore`, and create `.env.test.example` with the same content — it holds no real secrets, but keeping the pattern consistent avoids surprises later.

- [ ] **Step 6: Run the suite and triage**

Run: `pnpm test`
Expected: it runs. Some failures are likely on the first pass. The expected categories:

- **`jest` global not defined** — replace `jest.fn()` with `vi.fn()`, `jest.mock()` with `vi.mock()`, and add `import { vi } from 'vitest'` where needed.
- **Snapshot format differences** — vitest and jest serialise slightly differently.
- **Missing database tables** — Task 6 fixes the migrations; if this blocks, run Task 6 first and return here.

Fix each failure. Do not use `--update` on snapshots yet.

- [ ] **Step 7: Review snapshot changes deliberately**

Once the non-snapshot failures are fixed, run: `pnpm test -u`
Then run: `git diff -- '*.snap'`
Expected: only serialisation-format differences. If any snapshot's _content_ changed — different dates, different poll results, different text — that is a real regression from the discord.js or strict-mode changes. Investigate before accepting.

- [ ] **Step 8: Confirm a green suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: migrate from jest to vitest

Vitest uses esbuild for the TypeScript transform, which removes the need
for ts-jest and babel-jest and the babel packages behind them. Tests run
in a single fork because they share one Postgres instance."
```

---

## Task 6: Reset the Prisma migration history

**Files:**

- Create: `prisma/migrations/<timestamp>_init/migration.sql` (generated)
- Modify: `prisma/migrations/migration_lock.toml` (regenerated)
- Delete: `prisma/migrations/20231126101500_init/`, `prisma/migrations/20231128194432_init/`, `prisma/migrations/20231219220142_init/`, `prisma/migrations/20260131154044_init/`, `prisma/dev.db`

**Interfaces:**

- Consumes: a running Postgres from Task 5
- Produces: a migration history that `prisma migrate deploy` can apply to an empty database — required by Task 7's container start command

**Context:** The current history cannot deploy. `migration_lock.toml` records `provider = "sqlite"` while the schema declares `postgresql`, which Prisma rejects outright. `20260131154044_init/` contains no `migration.sql` at all. Two of the older migrations use `AUTOINCREMENT`, which is SQLite syntax. Since the production database is being recreated empty, the fix is a clean squash rather than a repair.

- [ ] **Step 1: Confirm the breakage before changing anything**

Run: `cat prisma/migrations/migration_lock.toml && ls prisma/migrations/20260131154044_init/`
Expected: the lock file says `provider = "sqlite"`, and the directory listing is empty. This confirms the diagnosis.

- [ ] **Step 2: Delete the old migrations and the stale SQLite file**

```bash
rm -rf prisma/migrations
rm -f prisma/dev.db
```

- [ ] **Step 3: Reset the local database**

```bash
docker compose down db
rm -rf .data/postgres
docker compose up -d db
```

If `.data/postgres` does not exist yet, that is fine — Task 8 introduces the bind mount. Until then the named volume is removed by `docker compose down -v db`.

- [ ] **Step 4: Generate the squashed migration**

```bash
DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public" \
  pnpm exec prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/migration.sql` and applies it.

- [ ] **Step 5: Verify the lock file and SQL are Postgres**

Run: `cat prisma/migrations/migration_lock.toml && grep -c SERIAL prisma/migrations/*/migration.sql`
Expected: `provider = "postgresql"`, and at least one `SERIAL` (Postgres autoincrement). There must be no `AUTOINCREMENT` anywhere:

Run: `grep -r AUTOINCREMENT prisma/migrations/ ; echo "exit=$?"`
Expected: no matches, `exit=1`.

- [ ] **Step 6: Verify a clean deploy against an empty database**

```bash
docker compose down db && rm -rf .data/postgres && docker compose up -d db
sleep 5
DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public" \
  pnpm exec prisma migrate deploy
```

Expected: `1 migration found` and it applies without error. This is exactly what the container will do on boot, so it must pass here.

- [ ] **Step 7: Confirm tests still pass against the fresh schema**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix(db): squash migration history into a single Postgres migration

The previous history could not be deployed: the lock file recorded
sqlite while the schema declares postgresql, one migration directory was
empty, and two contained SQLite-only AUTOINCREMENT syntax. Production
data is ephemeral, so the history is rebuilt from the current schema."
```

---

## Task 6a: Port `poll.service.ts` off SQLite-only raw SQL

**Files:**

- Modify: `src/services/poll.service.ts`, and any caller whose expectations change
- Test: `src/services/__tests__/poll.service.test.ts` and the other suites currently failing

**Interfaces:**

- Consumes: the working migration history from Task 6
- Produces: a green test suite — the gate every later task's verification assumes

**Why this exists:** discovered during Task 5. The spec's "Current State" table claimed the project already ran on Postgres. It did not. `migration_lock.toml` recorded `sqlite`, and `poll.service.ts` contains three raw SQL queries written for SQLite:

```sql
SELECT P.id as pollId, P.guildConnectionId, P.status, P.messageId, P.messageUrl, P.channelId,
       PA.userId, PA.answer, PA.username
FROM Poll P
LEFT JOIN PollAnswer PA ON PA.pollId = P.id
WHERE P.guildConnectionId = ${guildConnectionId}
```

SQLite treats identifiers case-insensitively. Postgres folds unquoted identifiers to lowercase, while Prisma creates `"Poll"` and `"guildConnectionId"` case-preserved. Every one of these queries fails against Postgres. This is the root cause of all 13 test failures at the end of Task 5, and it means `/schedule` and `/book` — the bot's core features — have never worked on Postgres.

**The decision:** replace the raw SQL with Prisma's query builder rather than quoting identifiers. Quoting is the smaller diff but leaves the trap in place for the next raw query, and it is easy to half-fix — aliases fold too, so `as pollId` returns `pollid` and a fix that only quotes table names leaves `pollId` undefined, which makes `closePoll` run `WHERE id = undefined`.

- [ ] **Step 1: Start from a known state**

```bash
docker compose up -d db
pnpm test 2>&1 | tail -20
```

Expected: 13 failures, all tracing to `poll.service.ts`. Record the exact list — it is the work queue and the completion gate.

- [ ] **Step 2: Rewrite `getInProgressPoll`**

Replace the `$queryRaw` with a `prisma.poll.findMany` that includes `PollAnswers`, filtered on `guildConnectionId` and `status: 'inProgress'`, ordered by poll `id` then answer `answeredDate` ascending.

Read the existing method and its `PollDetails` return type first. The raw query returns a **flat, joined row per answer**; a Prisma `include` returns **nested** poll objects with an answers array. Either map the nested result back to the flat shape the callers expect, or update the callers — decide based on which produces clearer code, and say which you chose and why.

- [ ] **Step 3: Rewrite `closePoll`**

Same treatment for the `$queryRaw<PollWithAnswers[]>`, then replace the `$executeRaw UPDATE Poll SET status = 'closed'` with `prisma.poll.update`.

Note the existing code indexes `pollWithAnswers[0].pollId` without checking the array is non-empty — closing a poll with no answers would throw on undefined. Handle that case explicitly rather than reproducing it.

- [ ] **Step 4: Verify no raw SQL remains**

```bash
grep -rn 'queryRaw\|executeRaw' src/
```

Expected: no matches. If a query genuinely cannot be expressed through the query builder, leave it, quote every identifier **including aliases**, and justify it in your report.

- [ ] **Step 5: Green suite**

Run: `pnpm test`
Expected: all tests pass, output pristine.

This is also the deferred verification of Task 4's `addPollResponse` reordering (commit `46f779f`), which Task 5 could not check because these tests were failing. Confirm those assertions specifically.

- [ ] **Step 6: Typecheck and lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(db): port poll queries from SQLite raw SQL to Prisma

The three raw queries in poll.service.ts used unquoted identifiers,
which SQLite treats case-insensitively but Postgres folds to lowercase
while Prisma creates them case-preserved. They have never worked against
Postgres. Using the query builder removes the identifier-folding trap
rather than papering over it with quoting."
```

---

## Task 7: Multi-stage Dockerfile

**Files:**

- Modify: `Dockerfile`, `.dockerignore`
- Create: `tsconfig.build.json` (replacing the existing stub)
- Delete: `healthcheck.sh`

**Interfaces:**

- Consumes: the `build` script from Task 3, the migration from Task 6
- Produces: an image whose entrypoint runs `prisma migrate deploy && node dist/index.js`; Task 9 deploys it

- [ ] **Step 1: Replace `tsconfig.build.json`**

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "noEmit": false,
        "sourceMap": false,
        "declaration": false,
        "declarationMap": false,
        "types": ["node"]
    },
    "exclude": ["node_modules", "dist", "src/**/__test__/**", "src/**/__tests__/**", "src/util/test-utils/**"]
}
```

The `types` override matters. Task 4 set `"types": ["node", "vitest/globals"]` in the base `tsconfig.json` so test files typecheck without a separate config. `types` **replaces** rather than extends, so the production build must drop `vitest/globals` — otherwise `describe`, `expect`, and `vi` are in scope for every production module and a stray `expect()` in `src/services/` would compile.

- [ ] **Step 2: Verify the build produces runnable output**

Run: `pnpm build && ls dist/`
Expected: `dist/index.js` and `dist/src/` exist. Note the exact path of the compiled entry point — `index.js` sits at the repo root, so with `rootDir: "."` it compiles to `dist/index.js` and imports `dist/src/app.js`. Confirm this before writing the `CMD`; if the layout differs, use the real path.

- [ ] **Step 3: Replace `.dockerignore`**

```
node_modules
dist
.git
.env
.env.*
.docker.env
.data
app.log
coverage
docs
*.md
.DS_Store
```

- [ ] **Step 4: Replace the `Dockerfile`**

```dockerfile
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN apk upgrade --no-cache && corepack enable

# ---- installer: full dependency tree for the build ----
FROM base AS installer
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile --prod --no-optional && pnpm exec prisma generate && pnpm store prune

COPY --from=builder /app/dist ./dist
COPY assets ./assets

RUN chown -R node:node /app
USER node

EXPOSE 8080

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
```

Note that `prisma generate` runs again in the runner stage rather than copying the generated client across — the client contains platform-specific query engine binaries, and regenerating is more reliable than copying.

**`prisma` must be in `dependencies`, not `devDependencies`.** Prisma's convention keeps the CLI dev-only, which assumes migrations run from CI or a developer machine. This container runs `prisma migrate deploy` itself on every boot, so the CLI is a genuine runtime dependency. Leaving it in `devDependencies` forces a second, non-frozen install in the runner stage, which ships an artifact whose dependency graph was re-resolved rather than lockfile-pinned, and duplicates ~156MB of Prisma.

**`--no-optional` is load-bearing.** `typescript` is an optional peer of `prisma` and `@prisma/client`. Without the flag, pnpm materialises it (~24MB) in the runtime image even under `--prod`, because the lockfile's peer-resolution key was baked in while devDependencies were present. Verify with `docker run --rm <image> ls node_modules/.pnpm | grep -i typescript` — checking top-level `node_modules` is not sufficient, since pnpm stores packages in the virtual store.

Measured result: 480MB, and the image's `pnpm-lock.yaml` hashes identically to the committed one.

- [ ] **Step 5: Delete the old healthcheck script**

```bash
rm -f healthcheck.sh
```

The `HEALTHCHECK` instruction is gone from the Dockerfile too — it only checked whether a process existed, which tells you nothing about whether the bot is functioning. Railway performs a real HTTP healthcheck against `/` instead, configured in Task 9.

- [ ] **Step 6: Build the image**

Run: `docker build -t gm-sidekick:test .`
Expected: builds successfully.

- [ ] **Step 7: Check the image size**

Run: `docker images gm-sidekick:test`
Expected: substantially smaller than the old image, which shipped the full dev dependency tree. Record the number for the commit message.

- [ ] **Step 8: Run the container against the local database**

```bash
docker compose up -d db
docker run --rm --network haagen-net \
  -e DATABASE_URL="postgresql://root:password@gm-sidekick-db:5432/gm_sidekick?schema=public" \
  -e BOT_TOKEN="$(grep '^BOT_TOKEN=' .env | cut -d= -f2-)" \
  -e APPLICATION_ID="$(grep '^APPLICATION_ID=' .env | cut -d= -f2-)" \
  -p 8080:8080 gm-sidekick:test
```

Expected: migrations apply, the bot logs `Client Ready`, and the health server starts.

- [ ] **Step 9: Verify the health endpoint**

In a second terminal, run: `curl -i localhost:8080`
Expected: `HTTP/1.1 200 OK` and body `ok`. Then stop the container.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "build: multi-stage Dockerfile with compiled output

Replaces the single-stage image that ran ts-node with the full dev
dependency tree installed. The runner stage carries only production
dependencies and compiled JavaScript, and runs as the non-root node
user. Migrations now apply at container start."
```

---

## Task 8: Local development with bind mounts

**Files:**

- Modify: `docker-compose.yml`, `.gitignore`, `.docker.env.example`, `.env.example`

**Interfaces:**

- Consumes: the image from Task 7
- Produces: `docker compose up` runs the full stack locally

- [ ] **Step 1: Replace `docker-compose.yml`**

```yaml
networks:
    haagen-net:
        name: haagen-net
        external: false

services:
    db:
        container_name: gm-sidekick-db
        image: postgres:17
        restart: unless-stopped
        volumes:
            - ./.data/postgres:/var/lib/postgresql/data
        ports:
            - 55432:5432
        networks:
            - haagen-net
        environment:
            POSTGRES_DB: gm_sidekick
            POSTGRES_PASSWORD: password
            POSTGRES_USER: root
        healthcheck:
            test: ['CMD-SHELL', 'pg_isready -U root -d gm_sidekick']
            interval: 5s
            timeout: 5s
            retries: 5

    app:
        container_name: gm-sidekick-app
        build:
            context: .
            dockerfile: Dockerfile
        restart: unless-stopped
        depends_on:
            db:
                condition: service_healthy
        networks:
            - haagen-net
        env_file:
            - .docker.env
```

Four things changed beyond the bind mount: the named `postgres-data` volume and the top-level `volumes:` block are gone; `POSTGRES_DB` is now `gm_sidekick` rather than `postgres`, matching the `DATABASE_URL` used in tests and scripts; `depends_on` uses a healthcheck condition so the app does not start before Postgres accepts connections; and the host port is **55432**, not 5432.

The port matters: on this machine 5432 is already bound by an unrelated project's container (`picstack-pg-db`), so `5432:5432` fails to bind. 55432 is what Task 5 already configured in the gitignored `.env.test`. Every `DATABASE_URL` that connects from the **host** must use 55432; connections from inside the compose network still use `db:5432`.

The `./init` mount is dropped — the directory does not exist in the repo, and Prisma migrations handle schema creation.

- [ ] **Step 2: Confirm `.data/` is gitignored**

Task 1 added it. Verify: `git check-ignore .data/postgres && echo ignored`
Expected: `ignored`

Committing the database's data directory would be a large mistake — check this before proceeding.

- [ ] **Step 3: Update `.env.example`**

```
NODE_ENV=local

APPLICATION_ID=
PUBLIC_KEY=
BOT_TOKEN=

CLIENT_ID=
CLIENT_SECRET=

AI_SERVICE_URL=
AI_SERVICE_API_KEY=

DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public"

ADMIN_USERS=''
```

The SQLite `file:./dev.db` example and the now-unused `TEST_DATABASE_URL` are both removed.

- [ ] **Step 4: Update `.docker.env.example`**

Same content, except the host is the container name rather than localhost:

```
DATABASE_URL="postgresql://root:password@db:5432/gm_sidekick?schema=public"
```

Remove the Neon comment block — it no longer reflects how this project is deployed.

- [ ] **Step 5: Bring the stack up from scratch**

```bash
docker compose down
rm -rf .data
docker compose up --build -d
```

Expected: both containers reach a running state, and the app applies migrations on first boot.

- [ ] **Step 6: Verify the bind mount holds data**

Run: `ls .data/postgres | head`
Expected: Postgres data files (`base`, `global`, `pg_wal`, …) are visible on the host.

- [ ] **Step 7: Verify data survives a full teardown**

```bash
docker compose down -v
docker compose up -d db
sleep 5
docker exec gm-sidekick-db psql -U root -d gm_sidekick -c '\dt'
```

Expected: the tables are still listed. This is the point of the bind mount — `-v` removes named volumes, but host directories survive.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "build: use host bind mounts for the local database

Postgres data now lives in ./.data/postgres on the host instead of a
named volume, so it survives docker compose down -v and can be inspected
directly. Adds a healthcheck gate on depends_on and corrects
POSTGRES_DB to match the DATABASE_URL used by tests."
```

---

## Task 9: Railway configuration and DigitalOcean teardown

**Files:**

- Create: `railway.json`
- Modify: `src/app.ts`
- Delete: `.github/workflows/deploy.yml`, `app.yaml`, `app.prod.yaml.example`, `.gcloudignore`

**Interfaces:**

- Consumes: the working image from Task 7
- Produces: a deployed bot

**Note:** Steps 4 through 8 happen in the Railway dashboard and require the user. Do not attempt them autonomously — pause and hand over.

- [ ] **Step 1: Make the port Railway-compatible**

In `src/app.ts`, change the port line. Railway injects `PORT` and routes traffic to it:

```ts
const port = process.env['PORT'] ?? process.env['HEALTH_PORT'] ?? 8080;
```

- [ ] **Step 2: Create `railway.json`**

```json
{
    "$schema": "https://railway.com/railway.schema.json",
    "build": {
        "builder": "DOCKERFILE",
        "dockerfilePath": "Dockerfile"
    },
    "deploy": {
        "healthcheckPath": "/",
        "healthcheckTimeout": 60,
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 10,
        "numReplicas": 1
    }
}
```

`numReplicas: 1` is deliberate. The bot holds a single Discord gateway connection and runs an in-process scheduler — a second replica would double-post scheduled messages.

- [ ] **Step 3: Remove the old deployment configuration**

```bash
rm -f .github/workflows/deploy.yml app.yaml app.prod.yaml.example .gcloudignore
```

If `.github/workflows/` is now empty, remove the directory too.

- [ ] **Step 4: Create the Railway project** _(user action)_

In the Railway dashboard: create a project, then **New → GitHub Repo → `TheIthorian/warhammer-schedule-bot`**, tracking `master`. Railway detects `railway.json` and uses the Dockerfile builder.

- [ ] **Step 5: Add the Postgres plugin** _(user action)_

**New → Database → PostgreSQL** in the same project.

- [ ] **Step 6: Wire the database URL** _(user action)_

On the app service, add a variable:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

The reference-variable syntax keeps traffic on Railway's private network rather than routing over the public internet.

- [ ] **Step 7: Set the remaining secrets** _(user action)_

On the app service, from the values in the local `.env`:

```
BOT_TOKEN
APPLICATION_ID
PUBLIC_KEY
CLIENT_ID
CLIENT_SECRET
AI_SERVICE_URL
AI_SERVICE_API_KEY
ADMIN_USERS
NODE_ENV=production
```

Do not set `PORT` — Railway injects it.

- [ ] **Step 8: Deploy and watch the logs** _(user action)_

Expected log sequence: pnpm install → build → `prisma migrate deploy` reports 1 migration applied → `health check running on port` → `Client Ready - logged in as ...`.

- [ ] **Step 9: Smoke test in Discord**

In a server where the bot is installed, run `/ping`.
Expected: it replies. Then run `/schedule` and confirm the poll posts correctly — this is the path most likely to be affected by the discord.js upgrade.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "ci: deploy to Railway instead of DigitalOcean

Railway builds the Dockerfile directly from the repo, so the Docker Hub
push step is no longer needed. Removes the leftover Google App Engine
configuration, which has been dead since the move to containers."
```

- [ ] **Step 11: Tear down the old infrastructure** _(user action, only after Step 9 passes)_

Delete the DigitalOcean app (`a3b323de-7f34-4e2a-b131-59946c59e2f2`) and, if unused elsewhere, the `theithorian/gm-sidekick` Docker Hub repository. Revoke the `DOCKERHUB_TOKEN` GitHub secret and the `DOCKERHUB_USERNAME` variable, which nothing reads any more.

---

## Task 10: Documentation

**Files:**

- Create: `CLAUDE.md`
- Modify: `README.MD`

**Interfaces:**

- Consumes: everything above
- Produces: nothing downstream — this is the final task

- [ ] **Step 1: Create `CLAUDE.md`**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Meta:** When the user states a new rule or convention, always add it to this file immediately before continuing with any other work.

## Overview

A Discord bot for scheduling tabletop roleplay sessions. Single Node package, deployed to Railway.

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Run locally with tsx watch
pnpm build                # Compile TypeScript to dist/
pnpm start                # Run the compiled output
pnpm test                 # Run vitest (requires `docker compose up -d db`)
pnpm lint                 # oxlint
pnpm format               # oxfmt
pnpm db:migrate           # Create and apply a migration locally
pnpm db:deploy            # Apply pending migrations (what the container runs)
pnpm deploy-commands      # Register slash commands with Discord
```
````

## Tech Stack

| Area            | Choice                       |
| --------------- | ---------------------------- |
| Runtime         | Node.js 24                   |
| Package manager | pnpm                         |
| Language        | TypeScript (strict)          |
| Database        | PostgreSQL via Prisma        |
| Discord         | discord.js v14               |
| Scheduling      | node-schedule                |
| Logging         | pino                         |
| Tests           | vitest                       |
| Lint / format   | oxlint + oxfmt               |
| Hosting         | Railway (Dockerfile builder) |

## Architecture

- `index.js` — entry point, calls `start()` from `src/app.ts`
- `src/app.ts` — wires up Discord event handlers, starts the health server and the scheduled message processor
- `src/commands/` — slash command handlers, dispatched by `commands/router.ts`
- `src/message-interactions/` — button and select-menu handlers
- `src/scheduling/` — poll creation, result formatting, and the scheduled message processor
- `src/services/` — data access on top of Prisma
- `prisma/schema.prisma` — database schema

## Conventions

### TypeScript

- **Never use `any`.** Use a runtime type guard when the type is not statically known.
- **Prefer `type` over `interface`** unless a class implements it.
- **Explicit return types** on every exported function.
- **Guard nullable Discord.js values** — accessors like `interaction.guildId` and `client.channels.fetch()` return
  nullable types. Log and return early rather than asserting with `!`.
- **Trailing commas** on multi-line constructs.

### Database

- **Postgres everywhere** — production, local, and tests. Never SQLite; the bot's domain is scheduling, and SQLite's
  lack of a native `DateTime` type would let tests pass while production misfires.
- **Tests use a real database.** `docker compose up -d db` provides it. Never mock Prisma.

### Testing

- Test files live in `__test__` / `__tests__` directories alongside the code they cover.
- Tests run in a single fork because they share one database.

### Deployment

Push to `master`. Railway builds the Dockerfile and deploys. Migrations apply at container start.

**Single replica only** — the bot holds one Discord gateway connection and runs an in-process scheduler. A second
replica would double-post scheduled messages.

### Git

Conventional Commits: `<type>(<scope>): <description>`, types
`feat|fix|chore|test|docs|refactor|style|perf|build|ci`.

````

- [ ] **Step 2: Rewrite the Deploying and Running sections of `README.MD`**

Replace the existing `## Running` and `## Deploying` sections with:

```markdown
## Running locally

```sh
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm dev
````

Or run the whole stack in containers:

```sh
docker compose up --build
```

Postgres data is stored in `./.data/postgres` on the host.

## Deploying

Push to `master`. Railway builds the Dockerfile and deploys automatically. Migrations apply on container start.

Slash commands are registered separately, and only need re-running when a command's definition changes:

```sh
pnpm deploy-commands
```

```

- [ ] **Step 3: Fix the environment variable section of `README.MD`**

Correct the `DATABASE_URL` line and delete the `TEST_DATABASE_URL` line:

```

DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public" # Postgres connection string

````

Also delete the stale DigitalOcean link under `## Project` at the bottom of the file.

- [ ] **Step 4: Run the full verification suite**

```bash
pnpm install --frozen-lockfile
pnpm audit
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test
docker compose up --build -d && sleep 15 && curl -i localhost:8080
````

Expected, in order: install succeeds · no vulnerabilities · lint passes · no type errors · `dist/` produced · tests pass · `HTTP/1.1 200 OK`.

Every one of these must pass. If any fails, fix it before committing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: document the Railway deployment and pnpm toolchain

Adds CLAUDE.md with the repo's conventions and replaces the
DigitalOcean deployment instructions in the README."
```

---

## Task 11: Upgrade to Prisma 7 (ESM migration)

**Files:**

- Create: `prisma.config.ts`
- Modify: `package.json`, `tsconfig.json`, `prisma/schema.prisma`, `src/primsaClient.ts`, `.gitignore`, `Dockerfile`, and every file with a relative import (43 files)

**Interfaces:**

- Consumes: a fully green build from Tasks 1–10
- Produces: nothing downstream

**Do not start this task until Task 9's Railway deploy is verified working.** Prisma 7 requires converting the project to ESM, which touches nearly every file. Keeping it isolated means a bad conversion is one `git revert` away from a working deployment.

**What Prisma 7 changes:** the `prisma-client-js` generator is replaced by `prisma-client` with a mandatory `output` path; the client is imported from that path instead of `@prisma/client`; `prisma.config.ts` replaces schema-embedded CLI config; environment variables no longer load automatically; and the project must be ESM.

**What this repo already satisfies:** the `@prisma/adapter-pg` driver adapter is already in use (`src/primsaClient.ts`), there are zero `require()` calls, and only two files import `@prisma/client`. The real work is the ESM conversion — 130 extensionless relative imports across 43 files.

- [ ] **Step 1: Confirm a clean starting point**

Run: `pnpm test && pnpm exec tsc --noEmit && git status --porcelain`
Expected: tests pass, no type errors, working tree clean. Do not start from a dirty tree — you will want a clean revert point.

- [ ] **Step 2: Convert the project to ESM**

Add to `package.json`:

```json
    "type": "module",
```

- [ ] **Step 3: Add `.js` extensions to every relative import**

Under ESM with `moduleResolution: nodenext`, relative imports must carry an explicit extension. This is mechanical:

```bash
find src -name '*.ts' -not -path '*/node_modules/*' -print0 \
  | xargs -0 sed -i '' -E "s|(from '\.[^']*)'|\1.js'|g"
sed -i '' -E "s|(from '\.[^']*)'|\1.js'|g" index.js
```

Then fix the double-extension cases the regex creates on imports that already had one:

```bash
find src -name '*.ts' -print0 | xargs -0 sed -i '' -E "s|\.js\.js'|.js'|g; s|\.json\.js'|.json'|g"
```

- [ ] **Step 4: Verify the rewrite**

Run: `grep -rhoE "from '\.[^']*'" src index.js | grep -vE "\.(js|json)'$" | wc -l`
Expected: `0` — every relative import now has an extension.

Run: `grep -rn "\.js\.js'" src index.js`
Expected: no matches.

Directory imports (`from './commands'`) need `/index.js` rather than `.js` — the sed above turns them into `'./commands.js'`, which is wrong. Find them:

Run: `pnpm exec tsc --noEmit 2>&1 | grep "TS2307"`
Fix each reported path to `'./commands/index.js'` form.

- [ ] **Step 5: Bump Prisma**

```bash
pnpm add @prisma/client@7.9.0 @prisma/adapter-pg@7.9.0
pnpm add -D prisma@7.9.0
```

- [ ] **Step 6: Update the generator block in `prisma/schema.prisma`**

```prisma
generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
}
```

The `datasource` block is unchanged.

- [ ] **Step 7: Create `prisma.config.ts`**

```ts
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
```

- [ ] **Step 8: Gitignore the generated client**

Append to `.gitignore`:

```
src/generated/
```

Add the same line to `.dockerignore` — the Dockerfile regenerates the client in both the installer and runner stages.

- [ ] **Step 9: Update the two client imports**

In `src/primsaClient.ts`:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './generated/prisma/client.js';
import { config } from './config.js';

const pool = new Pool({ connectionString: config.dbUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    log: ['warn', 'error'],
    adapter,
});

export default prisma;
```

Find the second file and update it the same way:

Run: `grep -rln "@prisma/client" src`
Change its import to the generated path, adjusting the relative depth.

- [ ] **Step 10: Regenerate the client**

Run: `pnpm exec prisma generate`
Expected: output written to `src/generated/prisma`.

- [ ] **Step 11: Verify types**

Run: `pnpm exec tsc --noEmit`
Expected: no output. Fix any remaining import or type errors before continuing.

- [ ] **Step 12: Verify tests**

```bash
docker compose up -d db
pnpm test
```

Expected: all tests pass. Vitest handles ESM natively, so no config change is needed — but if `vitest.setup.ts` or `vitest.config.ts` report module errors, they need `.js` extensions on their relative imports too.

- [ ] **Step 13: Verify the container still builds and runs**

```bash
docker compose up --build -d
sleep 15
curl -i localhost:8080
docker compose logs app | tail -20
```

Expected: `HTTP/1.1 200 OK`, and the logs show migrations applied followed by `Client Ready`.

If `prisma generate` fails inside the Docker build, the runner stage needs `prisma.config.ts` copied in — add it to the `COPY package.json pnpm-lock.yaml .npmrc ./` line in both the installer and runner stages.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "build(deps): upgrade to Prisma 7

Prisma 7 requires ESM, so the package is now type: module and all
relative imports carry explicit .js extensions. The client generator
moves to prisma-client with an explicit output path, and CLI
configuration moves to prisma.config.ts. The driver adapter setup was
already in place."
```

- [ ] **Step 15: Redeploy and smoke test** _(user action)_

Push to `master`, watch the Railway deploy, then run `/ping` and `/schedule` in Discord.

If anything is wrong, `git revert` this task's commit — Tasks 1–10 stand on their own.

---

## Verification Checklist

Run after all tasks are complete:

- [ ] `pnpm audit` reports no known vulnerabilities
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm exec tsc --noEmit` produces no output
- [ ] `pnpm build` produces `dist/index.js`
- [ ] `pnpm test` passes with all tests green
- [ ] `docker compose up --build` starts both services; `curl localhost:8080` returns 200
- [ ] `.data/postgres` exists on the host and survives `docker compose down -v`
- [ ] `grep -r AUTOINCREMENT prisma/` finds nothing
- [ ] `git grep -n 'file:./dev' -- ':!docs'` finds nothing (no SQLite references left outside the spec)
- [ ] `grep -rhoE "from '\.[^']*'" src index.js | grep -vE "\.(js|json)'$" | wc -l` returns 0 (Task 11 only)
- [ ] Railway deploy succeeds and the bot appears online in Discord
- [ ] `/ping` and `/schedule` both work in a real server
- [ ] DigitalOcean app deleted, Docker Hub credentials revoked
