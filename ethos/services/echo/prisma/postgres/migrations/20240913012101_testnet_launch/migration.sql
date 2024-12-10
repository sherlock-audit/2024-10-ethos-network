-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invitesSent" TEXT[],
    "invitesAcceptedIds" INTEGER[],
    "invitesAvailable" INTEGER NOT NULL,
    "invitedBy" INTEGER NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_addresses" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "profile_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" SERIAL NOT NULL,
    "senderProfileId" INTEGER NOT NULL,
    "recipient" VARCHAR(42) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "acceptedProfileId" INTEGER,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "statusUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL,
    "author" VARCHAR(42) NOT NULL,
    "authorProfileId" INTEGER NOT NULL,
    "subject" VARCHAR(42) NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "account" TEXT NOT NULL,
    "service" TEXT NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouches" (
    "id" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL,
    "unhealthy" BOOLEAN NOT NULL,
    "authorProfileId" INTEGER NOT NULL,
    "stakeToken" VARCHAR(42) NOT NULL,
    "subjectProfileId" INTEGER NOT NULL,
    "deposited" DECIMAL(78,0) NOT NULL,
    "staked" DECIMAL(78,0) NOT NULL,
    "balance" DECIMAL(78,0) NOT NULL,
    "withdrawn" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "mutualVouchId" INTEGER,
    "comment" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "vouchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "unvouchedAt" TIMESTAMP(3),
    "unhealthyAt" TIMESTAMP(3),

    CONSTRAINT "vouches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replies" (
    "id" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "targetContract" VARCHAR(42) NOT NULL,
    "authorProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "parentIsOriginalComment" BOOLEAN NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" INTEGER NOT NULL,
    "isUpvote" BOOLEAN NOT NULL,
    "isArchived" BOOLEAN NOT NULL,
    "voter" INTEGER NOT NULL,
    "targetContract" VARCHAR(42) NOT NULL,
    "targetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestations" (
    "id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL,
    "profileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "account" TEXT NOT NULL,
    "service" TEXT NOT NULL,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_events" (
    "id" SERIAL NOT NULL,
    "contract" TEXT NOT NULL,
    "logData" JSONB NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "txHash" VARCHAR(66) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "blockchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_events" (
    "eventId" INTEGER NOT NULL,
    "profileId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "review_events" (
    "eventId" INTEGER NOT NULL,
    "reviewId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "vouch_events" (
    "eventId" INTEGER NOT NULL,
    "vouchId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "reply_events" (
    "eventId" INTEGER NOT NULL,
    "replyId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "attestation_events" (
    "eventId" INTEGER NOT NULL,
    "attestationId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "vote_events" (
    "eventId" INTEGER NOT NULL,
    "voteId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "score_history" (
    "id" SERIAL NOT NULL,
    "target" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elements" JSONB NOT NULL,
    "errors" TEXT[],
    "dirty" BOOLEAN NOT NULL,

    CONSTRAINT "score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ens_cache" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "ensName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ens_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twitter_profiles_cache" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "biography" TEXT,
    "website" TEXT,
    "followersCount" INTEGER,
    "joinedAt" TIMESTAMP(3),
    "isBlueVerified" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twitter_profiles_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "lifetime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_events" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "profileId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profiles_archived_idx" ON "profiles"("archived");

-- CreateIndex
CREATE UNIQUE INDEX "profile_addresses_address_key" ON "profile_addresses"("address");

-- CreateIndex
CREATE INDEX "profile_addresses_profileId_idx" ON "profile_addresses"("profileId");

-- CreateIndex
CREATE INDEX "invitations_senderProfileId_idx" ON "invitations"("senderProfileId");

-- CreateIndex
CREATE INDEX "invitations_acceptedProfileId_idx" ON "invitations"("acceptedProfileId");

-- CreateIndex
CREATE INDEX "invitations_recipient_idx" ON "invitations"("recipient");

-- CreateIndex
CREATE INDEX "reviews_service_account_idx" ON "reviews"("service", "account");

-- CreateIndex
CREATE INDEX "reviews_archived_idx" ON "reviews"("archived");

-- CreateIndex
CREATE INDEX "reviews_author_idx" ON "reviews"("author");

-- CreateIndex
CREATE INDEX "reviews_subject_score_idx" ON "reviews"("subject", "score");

-- CreateIndex
CREATE UNIQUE INDEX "vouches_mutualVouchId_key" ON "vouches"("mutualVouchId");

-- CreateIndex
CREATE INDEX "vouches_archived_idx" ON "vouches"("archived");

-- CreateIndex
CREATE INDEX "vouches_authorProfileId_idx" ON "vouches"("authorProfileId");

-- CreateIndex
CREATE INDEX "vouches_subjectProfileId_idx" ON "vouches"("subjectProfileId");

-- CreateIndex
CREATE INDEX "replies_targetContract_parentId_idx" ON "replies"("targetContract", "parentId");

-- CreateIndex
CREATE INDEX "votes_voter_idx" ON "votes"("voter");

-- CreateIndex
CREATE INDEX "votes_targetContract_targetId_isArchived_idx" ON "votes"("targetContract", "targetId", "isArchived");

-- CreateIndex
CREATE INDEX "votes_targetId_isUpvote_idx" ON "votes"("targetId", "isUpvote");

-- CreateIndex
CREATE UNIQUE INDEX "attestations_hash_key" ON "attestations"("hash");

-- CreateIndex
CREATE INDEX "attestations_profileId_idx" ON "attestations"("profileId");

-- CreateIndex
CREATE INDEX "blockchain_events_contract_idx" ON "blockchain_events"("contract");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_events_blockNumber_blockIndex_txHash_key" ON "blockchain_events"("blockNumber", "blockIndex", "txHash");

-- CreateIndex
CREATE UNIQUE INDEX "profile_events_eventId_profileId_key" ON "profile_events"("eventId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "review_events_eventId_reviewId_key" ON "review_events"("eventId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "vouch_events_eventId_vouchId_key" ON "vouch_events"("eventId", "vouchId");

-- CreateIndex
CREATE UNIQUE INDEX "reply_events_eventId_replyId_key" ON "reply_events"("eventId", "replyId");

-- CreateIndex
CREATE UNIQUE INDEX "attestation_events_eventId_attestationId_key" ON "attestation_events"("eventId", "attestationId");

-- CreateIndex
CREATE UNIQUE INDEX "vote_events_eventId_voteId_key" ON "vote_events"("eventId", "voteId");

-- CreateIndex
CREATE INDEX "score_history_target_dirty_idx" ON "score_history"("target", "dirty");

-- CreateIndex
CREATE INDEX "score_history_score_idx" ON "score_history"("score");

-- CreateIndex
CREATE INDEX "score_history_createdAt_idx" ON "score_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ens_cache_address_key" ON "ens_cache"("address");

-- CreateIndex
CREATE INDEX "ens_cache_address_idx" ON "ens_cache"("address");

-- CreateIndex
CREATE INDEX "ens_cache_ensName_idx" ON "ens_cache"("ensName");

-- CreateIndex
CREATE INDEX "twitter_profiles_cache_username_idx" ON "twitter_profiles_cache"("username");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_profileId_token_key" ON "escrow"("profileId", "token");

-- CreateIndex
CREATE INDEX "escrow_events_profileId_token_idx" ON "escrow_events"("profileId", "token");

-- AddForeignKey
ALTER TABLE "profile_addresses" ADD CONSTRAINT "profile_addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_senderProfileId_fkey" FOREIGN KEY ("senderProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_acceptedProfileId_fkey" FOREIGN KEY ("acceptedProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_subjectProfileId_fkey" FOREIGN KEY ("subjectProfileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouches" ADD CONSTRAINT "vouches_mutualVouchId_fkey" FOREIGN KEY ("mutualVouchId") REFERENCES "vouches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_events" ADD CONSTRAINT "profile_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_events" ADD CONSTRAINT "profile_events_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouch_events" ADD CONSTRAINT "vouch_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouch_events" ADD CONSTRAINT "vouch_events_vouchId_fkey" FOREIGN KEY ("vouchId") REFERENCES "vouches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_events" ADD CONSTRAINT "reply_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_events" ADD CONSTRAINT "reply_events_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestation_events" ADD CONSTRAINT "attestation_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestation_events" ADD CONSTRAINT "attestation_events_attestationId_fkey" FOREIGN KEY ("attestationId") REFERENCES "attestations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_events" ADD CONSTRAINT "vote_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_events" ADD CONSTRAINT "vote_events_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_events" ADD CONSTRAINT "escrow_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "blockchain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_events" ADD CONSTRAINT "escrow_events_profileId_token_fkey" FOREIGN KEY ("profileId", "token") REFERENCES "escrow"("profileId", "token") ON DELETE RESTRICT ON UPDATE CASCADE;
