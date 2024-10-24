-- MANUAL EDIT
-- adds support for case insensitive text fields
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateTable
CREATE TABLE "address_history_cache" (
    "address" CITEXT NOT NULL,
    "firstTransaction" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_history_cache_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "transaction_history_cache" (
    "fromAddress" CITEXT NOT NULL,
    "toAddress" CITEXT NOT NULL,
    "hash" CITEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "blockTimestamp" TIMESTAMP(3) NOT NULL,
    "fromAddressLabel" TEXT,
    "fromAddressLogo" TEXT,
    "toAddressLabel" TEXT,
    "toAddressLogo" TEXT,
    "category" TEXT,
    "summary" TEXT
);

-- CreateIndex
CREATE INDEX "address_history_cache_address_updatedAt_idx" ON "address_history_cache"("address", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_history_cache_hash_key" ON "transaction_history_cache"("hash");

-- CreateIndex
CREATE INDEX "transaction_history_cache_updatedAt_fromAddress_idx" ON "transaction_history_cache"("updatedAt", "fromAddress");

-- CreateIndex
CREATE INDEX "transaction_history_cache_updatedAt_toAddress_idx" ON "transaction_history_cache"("updatedAt", "toAddress");

-- CreateIndex
CREATE INDEX "transaction_history_cache_fromAddress_idx" ON "transaction_history_cache"("fromAddress");

-- CreateIndex
CREATE INDEX "transaction_history_cache_toAddress_idx" ON "transaction_history_cache"("toAddress");

-- CreateIndex
CREATE INDEX "transaction_history_cache_blockNumber_idx" ON "transaction_history_cache"("blockNumber");
