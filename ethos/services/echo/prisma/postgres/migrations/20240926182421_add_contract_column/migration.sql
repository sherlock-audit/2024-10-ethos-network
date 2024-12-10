-- CreateEnum
CREATE TYPE "Contract" AS ENUM ('profile', 'vouch', 'review', 'attestation', 'discussion');

-- AlterTable
ALTER TABLE "replies" ADD COLUMN     "contract" "Contract";

-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "contract" "Contract";

-- CreateIndex
CREATE INDEX "replies_contract_parentId_idx" ON "replies"("contract", "parentId");

-- CreateIndex
CREATE INDEX "votes_contract_targetId_idx" ON "votes"("contract", "targetId");
