# Warhammer Schedule Bot

## Developing Bots

https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands

## Running

```sh
npm i
npm start
```

## Deploying

```sh
gcloud app deploy
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
