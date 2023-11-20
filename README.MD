# Warhammer Schedule Bot

## Developing Bots

https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands

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

Then the app can be deployed

```sh
gcloud app deploy app.prod.yaml
```

## Commands

| command      | description                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- |
| /ping        | Replies with Pong!                                                                            |
| /schedule    | Asks everyone which days they are available for the next session                              |
| /book <date> | Books in a session for the given date. Will send a reminder to everyone closer scheduled date |
| /roll <dice> | Roll dice                                                                                     |

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

logs: https://console.cloud.google.com/logs/query;storageScope=storage,projects%2Fgm-sidekick-discord-bot%2Flocations%2Fglobal%2Fbuckets%2F_Default%2Fviews%2F_AllLogs,projects%2Fgm-sidekick-discord-bot%2Flocations%2Fglobal%2Fbuckets%2F_Default%2Fviews%2F_Default;cursorTimestamp=2023-11-20T19:36:44.753906Z;duration=P7D?serviceId=default&versionId=20231120t191852&project=gm-sidekick-discord-bot

builds: https://console.cloud.google.com/cloud-build/builds;region=europe-west2?project=gm-sidekick-discord-bot

billing: https://console.cloud.google.com/billing/014C3A-E32E31-15BC93?organizationId=0&project=summer-nucleus-396817

app engine: https://console.cloud.google.com/appengine?serviceId=default&project=gm-sidekick-discord-bot
