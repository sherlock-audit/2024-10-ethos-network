-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('REVIEW', 'TRUST_BATTLE', 'TRUST_CHECK', 'REVIEW_CHECK', 'REVIEW_VOTE', 'SCORE_CHECK');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContributionAnswer" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'UNSURE');

-- CreateTable
CREATE TABLE "contribution_bundles" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,

    CONSTRAINT "contribution_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" SERIAL NOT NULL,
    "contributionBundleId" INTEGER NOT NULL,
    "type" "ContributionType" NOT NULL,
    "experience" DOUBLE PRECISION NOT NULL,
    "status" "ContributionStatus" NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_trust_checks" (
    "contributionId" INTEGER NOT NULL,
    "targetUserkey" TEXT NOT NULL,
    "answer" "ContributionAnswer",

    CONSTRAINT "contribution_trust_checks_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "contribution_reviews" (
    "contributionId" INTEGER NOT NULL,
    "targetUserkeys" TEXT[],
    "reviewId" INTEGER,

    CONSTRAINT "contribution_reviews_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "contribution_trust_battles" (
    "contributionId" INTEGER NOT NULL,
    "targetUserkeys" TEXT[],
    "chosenIndex" INTEGER,

    CONSTRAINT "contribution_trust_battles_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "contribution_score_checks" (
    "contributionId" INTEGER NOT NULL,
    "targetUserkey" TEXT NOT NULL,
    "answer" "ContributionAnswer",

    CONSTRAINT "contribution_score_checks_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "contribution_review_checks" (
    "contributionId" INTEGER NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "answer" "ContributionAnswer",

    CONSTRAINT "contribution_review_checks_pkey" PRIMARY KEY ("contributionId")
);

-- CreateTable
CREATE TABLE "contribution_review_votes" (
    "contributionId" INTEGER NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "voteId" INTEGER,

    CONSTRAINT "contribution_review_votes_pkey" PRIMARY KEY ("contributionId")
);

-- CreateIndex
CREATE INDEX "contribution_bundles_profileId_idx" ON "contribution_bundles"("profileId");

-- CreateIndex
CREATE INDEX "contributions_contributionBundleId_idx" ON "contributions"("contributionBundleId");

-- CreateIndex
CREATE INDEX "contributions_status_idx" ON "contributions"("status");

-- AddForeignKey
ALTER TABLE "contribution_bundles" ADD CONSTRAINT "contribution_bundles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contributionBundleId_fkey" FOREIGN KEY ("contributionBundleId") REFERENCES "contribution_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_trust_checks" ADD CONSTRAINT "contribution_trust_checks_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_reviews" ADD CONSTRAINT "contribution_reviews_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_reviews" ADD CONSTRAINT "contribution_reviews_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_trust_battles" ADD CONSTRAINT "contribution_trust_battles_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_score_checks" ADD CONSTRAINT "contribution_score_checks_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_review_checks" ADD CONSTRAINT "contribution_review_checks_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_review_checks" ADD CONSTRAINT "contribution_review_checks_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_review_votes" ADD CONSTRAINT "contribution_review_votes_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_review_votes" ADD CONSTRAINT "contribution_review_votes_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_review_votes" ADD CONSTRAINT "contribution_review_votes_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
