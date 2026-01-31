# Warhammer Schedule Bot

## Developing Bots

https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands

## Setting environment variables

```sh
APPLICATION_ID= # Application Id from creating discord bot
PUBLIC_KEY= # Public key from creating discord bot
BOT_TOKEN= # Client secret that must be generated and hidden

CLIENT_ID= # Same as application Id. This will be replaced by Application Id in future.
CLIENT_SECRET= # Idk where this came from ??

AI_SERVICE_URL= # Url for the ai service
AI_SERVICE_API_KEY= # Application key for the ai service

DATABASE_URL="file:./dev.db" # Database to store persistent data
TEST_DATABASE_URL="file:./dev.test.db" # Test database swapped out during tests

ADMIN_USERS='' # Comma delimited list of users who are admins. Have increased permissions.
```

## Running

```sh
npm i
npm start
```

## Deploying

First, the commands need to be uploaded to discord

```sh
npm run deploy-commands
```

Deploy to digital ocean

```sh
docker build . -t theithorian/gm-sidekick:latest
docker push theithorian/gm-sidekick:latest
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

app: https://cloud.digitalocean.com/apps/a3b323de-7f34-4e2a-b131-59946c59e2f2/settings?i=244b97
