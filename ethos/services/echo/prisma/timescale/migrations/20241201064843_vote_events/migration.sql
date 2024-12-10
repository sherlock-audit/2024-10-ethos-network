-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('TRUST', 'DISTRUST');

-- CreateTable
CREATE TABLE "market_votes" (
    "marketProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voteType" "VoteType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "funds" DECIMAL(78,0) NOT NULL,
    "eventType" "EventType" NOT NULL,

    CONSTRAINT "market_votes_pkey" PRIMARY KEY ("marketProfileId","createdAt")
);

-- CreateIndex
CREATE INDEX "market_votes_createdAt_idx" ON "market_votes"("createdAt" DESC);
