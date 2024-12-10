-- CreateEnum
CREATE TYPE "MarketVoteEventType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "markets" (
    "profileId" INTEGER NOT NULL,
    "creatorAddress" VARCHAR(42) NOT NULL,
    "positivePrice" TEXT NOT NULL,
    "negativePrice" TEXT NOT NULL,
    "trustVotes" INTEGER NOT NULL,
    "distrustVotes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "market_events" (
    "eventId" INTEGER NOT NULL,
    "marketProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "positivePrice" TEXT NOT NULL,
    "negativePrice" TEXT NOT NULL,
    "deltaVoteTrust" INTEGER NOT NULL,
    "deltaVoteDistrust" INTEGER NOT NULL,
    "deltaPositivePrice" TEXT NOT NULL,
    "deltaNegativePrice" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "market_vote_events" (
    "eventId" INTEGER NOT NULL,
    "type" "MarketVoteEventType" NOT NULL,
    "actorAddress" VARCHAR(42) NOT NULL,
    "marketProfileId" INTEGER NOT NULL,
    "isPositive" BOOLEAN NOT NULL,
    "amount" INTEGER NOT NULL,
    "funds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "market_events_marketProfileId_createdAt_idx" ON "market_events"("marketProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_events_eventId_marketProfileId_key" ON "market_events"("eventId", "marketProfileId");

-- CreateIndex
CREATE INDEX "market_vote_events_marketProfileId_createdAt_idx" ON "market_vote_events"("marketProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "market_vote_events_eventId_marketProfileId_key" ON "market_vote_events"("eventId", "marketProfileId");

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_events" ADD CONSTRAINT "market_events_marketProfileId_fkey" FOREIGN KEY ("marketProfileId") REFERENCES "markets"("profileId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_vote_events" ADD CONSTRAINT "market_vote_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_vote_events" ADD CONSTRAINT "market_vote_events_marketProfileId_fkey" FOREIGN KEY ("marketProfileId") REFERENCES "markets"("profileId") ON DELETE RESTRICT ON UPDATE CASCADE;
