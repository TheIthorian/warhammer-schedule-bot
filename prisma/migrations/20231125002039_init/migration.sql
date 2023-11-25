-- CreateTable
CREATE TABLE "GuildConnection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "connectionUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "Poll_guildConnectionId_fkey" FOREIGN KEY ("guildConnectionId") REFERENCES "GuildConnection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PollAnswer" (
    "pollId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    CONSTRAINT "PollAnswer_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildConnectionId" INTEGER NOT NULL,
    "messageContent" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "channelId" TEXT NOT NULL,
    CONSTRAINT "ScheduledMessage_guildConnectionId_fkey" FOREIGN KEY ("guildConnectionId") REFERENCES "GuildConnection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConnection_guildId_key" ON "GuildConnection"("guildId");

-- CreateIndex
CREATE INDEX "GuildConnection_guildId_idx" ON "GuildConnection"("guildId");

-- CreateIndex
CREATE INDEX "GuildConnection_connectionUserId_idx" ON "GuildConnection"("connectionUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PollAnswer_pollId_userId_answer_key" ON "PollAnswer"("pollId", "userId", "answer");
