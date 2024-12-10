-- CreateTable
CREATE TABLE "blockchain_event_polls" (
    "contract" TEXT NOT NULL,
    "lastBlockNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_event_polls_contract_key" ON "blockchain_event_polls"("contract");
