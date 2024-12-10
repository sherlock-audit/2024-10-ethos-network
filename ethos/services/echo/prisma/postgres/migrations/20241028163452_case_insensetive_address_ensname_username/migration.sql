-- AlterTable
ALTER TABLE "ens_cache" ALTER COLUMN "address" SET DATA TYPE CITEXT,
ALTER COLUMN "ensName" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "profile_addresses" ALTER COLUMN "address" SET DATA TYPE CITEXT;

-- AlterTable
ALTER TABLE "twitter_profiles_cache" ALTER COLUMN "username" SET DATA TYPE CITEXT;
