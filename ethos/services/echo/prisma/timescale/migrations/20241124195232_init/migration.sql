-- CreateTable
-- This will fail on the first attempt of `prisma migrate reset`.
-- https://github.com/prisma/prisma/issues/8325
-- Rerunning will succeed.
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE "market_prices" (
    "marketProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustPrice" DECIMAL(78,0) NOT NULL,
    "distrustPrice" DECIMAL(78,0) NOT NULL,
    "deltaTrustPrice" DECIMAL(78,0) NOT NULL,
    "deltaDistrustPrice" DECIMAL(78,0) NOT NULL,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("marketProfileId","createdAt")
);


SELECT create_hypertable('market_prices', 'createdAt', 'marketProfileId',
    number_partitions => 4 );
