-- CreateEnum
CREATE TYPE "ProfileEventType" AS ENUM ('create', 'archive', 'restore', 'invite', 'uninvite');

-- CreateEnum
CREATE TYPE "ReviewEventType" AS ENUM ('create', 'edit', 'archive', 'restore');

-- CreateEnum
CREATE TYPE "VouchEventType" AS ENUM ('create', 'unvouch', 'unhealthy');

-- CreateEnum
CREATE TYPE "ReplyEventType" AS ENUM ('create', 'edit');

-- CreateEnum
CREATE TYPE "AttestationEventType" AS ENUM ('create', 'archive', 'restore', 'claim');

-- CreateEnum
CREATE TYPE "VoteEventType" AS ENUM ('create', 'archive', 'update');

-- AlterTable
ALTER TABLE "attestation_events" ADD COLUMN     "type" "AttestationEventType";

-- AlterTable
ALTER TABLE "profile_events" ADD COLUMN     "type" "ProfileEventType";

-- AlterTable
ALTER TABLE "reply_events" ADD COLUMN     "type" "ReplyEventType";

-- AlterTable
ALTER TABLE "review_events" ADD COLUMN     "type" "ReviewEventType";

-- AlterTable
ALTER TABLE "vote_events" ADD COLUMN     "type" "VoteEventType";

-- AlterTable
ALTER TABLE "vouch_events" ADD COLUMN     "type" "VouchEventType";
