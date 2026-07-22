# Warhammer Schedule Bot

## Developing Bots

https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands

## Setting environment variables

Copy `.env.example` to `.env` and fill it in:

```sh
APPLICATION_ID= # Application Id from creating discord bot
PUBLIC_KEY= # Public key from creating discord bot
BOT_TOKEN= # Client secret that must be generated and hidden

CLIENT_ID= # Same as application Id. This will be replaced by Application Id in future.
CLIENT_SECRET= # Idk where this came from ??

AI_SERVICE_URL= # Url for the ai service
AI_SERVICE_API_KEY= # Application key for the ai service

DATABASE_URL="postgresql://root:password@localhost:55432/gm_sidekick?schema=public" # Postgres connection string

ADMIN_USERS='' # Comma delimited list of users who are admins. Have increased permissions.
```

Running the test suite also needs `.env.test` (copy `.env.test.example`). It sets `TEST_DATABASE_URL`, which
`src/config.ts` swaps in for `DATABASE_URL` whenever `NODE_ENV=test`, so the app code under test never talks to the
database used for local development.

## Running locally

```sh
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm dev
```

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

## Commands

| command          | description                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------- |
| /ping            | Replies with Pong!                                                                            |
| /schedule        | Asks everyone which days they are available for the next session                              |
| /book :date      | Books in a session for the given date. Will send a reminder to everyone closer scheduled date |
| /roll :dice      | Roll dice                                                                                     |
| /query :question | Ask ai a question about the rule book                                                         |

## Required Permissions

-   Send Message
-   Create Public Threads
-   Create Private Threads
-   Send Messages in Threads
-   Mention Everyone
-   Add Reactions

Resulting integer: 377957255232

## Ideas

Usa AI to search pdf https://github.com/imartinez/privateGPT

## Project

Hosted on Railway. See `CLAUDE.md` for the deployment and architecture notes.
