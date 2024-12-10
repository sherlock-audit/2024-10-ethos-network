/*
  Warnings:

  - You are about to drop the column `stakeToken` on the `vouches` table. All the data in the column will be lost.
  - You are about to drop the `escrow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `escrow_events` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `authorAddress` to the `vouches` table without a default value. This is not possible if the table is not empty.

*/

-- DropTable
DROP TABLE "escrow" CASCADE;

-- DropTable
DROP TABLE "escrow_events" CASCADE;

-- Delete existing blockchain events and data as we are relaunching the contracts
-- Core blockchain event tables
TRUNCATE "blockchain_events" RESTART IDENTITY CASCADE;
TRUNCATE "blockchain_event_polls" RESTART IDENTITY CASCADE;

-- Event-specific tables and their relations
TRUNCATE "profile_events" RESTART IDENTITY CASCADE;
TRUNCATE "review_events" RESTART IDENTITY CASCADE;
TRUNCATE "vouch_events" RESTART IDENTITY CASCADE;
TRUNCATE "reply_events" RESTART IDENTITY CASCADE;
TRUNCATE "attestation_events" RESTART IDENTITY CASCADE;
TRUNCATE "vote_events" RESTART IDENTITY CASCADE;
TRUNCATE "market_events" RESTART IDENTITY CASCADE;
TRUNCATE "market_vote_events" RESTART IDENTITY CASCADE;

-- Main data tables that are populated from blockchain events
TRUNCATE "profiles" RESTART IDENTITY CASCADE;
TRUNCATE "vouches" RESTART IDENTITY CASCADE;
TRUNCATE "reviews" RESTART IDENTITY CASCADE;
TRUNCATE "replies" RESTART IDENTITY CASCADE;
TRUNCATE "votes" RESTART IDENTITY CASCADE;
TRUNCATE "attestations" RESTART IDENTITY CASCADE;
TRUNCATE "markets" RESTART IDENTITY CASCADE;

-- Reset scores and related tables
TRUNCATE "score_history" RESTART IDENTITY CASCADE;
TRUNCATE "score_history_elements" RESTART IDENTITY CASCADE;
TRUNCATE "score_element_records" RESTART IDENTITY CASCADE;
TRUNCATE "score_algorithms" RESTART IDENTITY CASCADE;
TRUNCATE "score_element_definitions" RESTART IDENTITY CASCADE;

-- Reset XP
TRUNCATE "xp_points_history" RESTART IDENTITY CASCADE;

-- AlterEnum
ALTER TYPE "VouchEventType" ADD VALUE 'increase';
ALTER TYPE "VouchEventType" ADD VALUE 'deposit_rewards';
ALTER TYPE "VouchEventType" ADD VALUE 'withdraw_rewards';
ALTER TYPE "VouchEventType" ADD VALUE 'slash';

-- AlterTable
ALTER TABLE "vouches" DROP COLUMN "stakeToken",
ADD COLUMN     "authorAddress" VARCHAR(42) NOT NULL;

-- CreateTable
CREATE TABLE "rewards" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "balance" DECIMAL(78,0) NOT NULL,
    "lifetime" DECIMAL(78,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rewards_profileId_idx" ON "rewards"("profileId");

-- CreateIndex
CREATE INDEX "rewards_createdAt_idx" ON "rewards"("createdAt");

-- AddForeignKey
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
