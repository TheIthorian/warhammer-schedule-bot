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
pnpm db:migrate           # Create and apply a migration locally (prisma migrate dev)
pnpm db:generate          # Regenerate the Prisma client
pnpm db:deploy            # Apply pending migrations (what the container runs at boot)
pnpm deploy-commands      # Register slash commands with Discord
pnpm invite-link          # Print an OAuth invite link for the bot
```

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
- `src/spam/` — command-spam protection
- `src/oauth/` — Discord OAuth flow
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
- **No raw SQL.** Use Prisma's query builder. `poll.service.ts` was originally written with raw SQL that relied on
  SQLite's unquoted-identifier behaviour; it broke silently on Postgres and was ported to the query builder. Raw
  queries are a recurring source of dialect-specific bugs in this codebase — don't reintroduce them.
- **Tests use a real database.** `docker compose up -d db` provides it, exposed on the host at `localhost:55432`
  (port 5432 is taken by another project on the primary dev machine; inside the compose network it's still
  `db:5432`). Never mock Prisma.
- **`prisma` is a runtime dependency, not a dev dependency**, contrary to Prisma's own convention (which assumes
  migrations run from CI or a developer machine). This container runs `prisma migrate deploy` at every boot, so the
  CLI has to be present in the production image. Don't "fix" this by moving it back to `devDependencies` — it will
  break deploys.

### Testing

- Test files live in `__test__` / `__tests__` directories alongside the code they cover.
- Tests run serially (`fileParallelism: false` in `vitest.config.ts`) because they share one database. Vitest 4
  removed the older `poolOptions.forks.singleFork` setting; `fileParallelism` is what actually takes effect now —
  don't reach for `poolOptions` here, it's silently ignored.
- Currently 61 tests across 9 files, all passing.

### Deployment

Push to `master`. Railway builds the Dockerfile and deploys. Migrations apply at container start (`prisma migrate
deploy` runs before `node dist/index.js` in the container's `CMD`).

**`numReplicas: 1` in `railway.json` is load-bearing — do not raise it.** The bot holds a single Discord gateway
connection and runs an in-process `node-schedule` scheduler for scheduled messages. A second replica would open a
second gateway connection and run a second copy of the scheduler, so every scheduled message would post twice and
every interaction would risk being handled twice. JSON has no comments, so this file is the only place that
explains why the replica count must stay at 1 — if someone bumps it "for redundancy," that's the bug they'll cause.

CI (`.github/workflows/ci.yml`) runs lint, typecheck and tests on every push and pull request, but it does not gate
the Railway deploy — a push to `master` deploys regardless of CI's result on that commit.

### Tooling

- `pnpm-workspace.yaml` exists solely for its `allowBuilds` block, required by pnpm 11 to permit build scripts for
  `@prisma/client`, `@prisma/engines`, `prisma`, `esbuild`, and `unrs-resolver`. It is not a multi-package workspace.

### Git

Conventional Commits: `<type>(<scope>): <description>`, types
`feat|fix|chore|test|docs|refactor|style|perf|build|ci`.
