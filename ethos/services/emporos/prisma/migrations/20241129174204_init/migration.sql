-- adds support for case insensitive text fields
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "twitterUsername" TEXT,
    "twitterName" TEXT,
    "avatarUrl" TEXT,
    "embeddedWallet" CITEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_twitterUserId_idx" ON "users"("twitterUserId");

-- CreateIndex
CREATE INDEX "users_embeddedWallet_idx" ON "users"("embeddedWallet");
