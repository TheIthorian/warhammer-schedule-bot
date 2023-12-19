-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduledMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildConnectionId" INTEGER NOT NULL,
    "messageContent" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ScheduledMessage_guildConnectionId_fkey" FOREIGN KEY ("guildConnectionId") REFERENCES "GuildConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledMessage" ("channelId", "guildConnectionId", "id", "messageContent", "scheduledDate", "status") SELECT "channelId", "guildConnectionId", "id", "messageContent", "scheduledDate", "status" FROM "ScheduledMessage";
DROP TABLE "ScheduledMessage";
ALTER TABLE "new_ScheduledMessage" RENAME TO "ScheduledMessage";
CREATE INDEX "ScheduledMessage_messageContent_status_idx" ON "ScheduledMessage"("messageContent", "status");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
