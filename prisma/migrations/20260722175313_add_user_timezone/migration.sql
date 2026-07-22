-- CreateTable
CREATE TABLE "UserTimezone" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTimezone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTimezone_userId_key" ON "UserTimezone"("userId");

-- CreateIndex
CREATE INDEX "UserTimezone_userId_idx" ON "UserTimezone"("userId");
