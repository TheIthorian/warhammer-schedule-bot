-- CreateTable
CREATE TABLE "GuildConnection" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "connectionUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "GuildConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" SERIAL NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageUrl" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollAnswer" (
    "pollId" INTEGER NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "answer" TEXT NOT NULL,
    "answeredDate" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" SERIAL NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    "messageContent" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConnection_guildId_key" ON "GuildConnection"("guildId");

-- CreateIndex
CREATE INDEX "GuildConnection_guildId_idx" ON "GuildConnection"("guildId");

-- CreateIndex
CREATE INDEX "GuildConnection_connectionUserId_idx" ON "GuildConnection"("connectionUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PollAnswer_pollId_userId_key" ON "PollAnswer"("pollId", "userId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_messageContent_status_idx" ON "ScheduledMessage"("messageContent", "status");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_guildConnectionId_fkey" FOREIGN KEY ("guildConnectionId") REFERENCES "GuildConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollAnswer" ADD CONSTRAINT "PollAnswer_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_guildConnectionId_fkey" FOREIGN KEY ("guildConnectionId") REFERENCES "GuildConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
