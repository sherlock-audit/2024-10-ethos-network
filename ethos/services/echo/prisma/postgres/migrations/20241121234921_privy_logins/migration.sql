-- CreateTable
CREATE TABLE "privy_logins" (
    "id" TEXT NOT NULL,
    "twitterUserId" TEXT NOT NULL,
    "embeddedWallet" CITEXT NOT NULL,
    "smartWallet" CITEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privy_logins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "privy_logins_twitterUserId_idx" ON "privy_logins"("twitterUserId");

-- CreateIndex
CREATE INDEX "privy_logins_smartWallet_idx" ON "privy_logins"("smartWallet");
