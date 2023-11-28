-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PollAnswer" (
    "pollId" INTEGER NOT NULL,
    "guildConnectionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "answer" TEXT NOT NULL,
    "answeredDate" DATETIME NOT NULL,
    CONSTRAINT "PollAnswer_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PollAnswer" ("answer", "answeredDate", "guildConnectionId", "pollId", "userId", "username") SELECT "answer", "answeredDate", "guildConnectionId", "pollId", "userId", "username" FROM "PollAnswer";
DROP TABLE "PollAnswer";
ALTER TABLE "new_PollAnswer" RENAME TO "PollAnswer";
CREATE UNIQUE INDEX "PollAnswer_pollId_userId_key" ON "PollAnswer"("pollId", "userId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
