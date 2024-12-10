-- DropIndex
DROP INDEX "attestations_account_idx";

-- DropIndex
DROP INDEX "invitations_senderProfileId_idx";

-- CreateIndex
CREATE INDEX "attestations_service_account_archived_idx" ON "attestations"("service", "account", "archived");

-- CreateIndex
CREATE INDEX "invitations_senderProfileId_status_idx" ON "invitations"("senderProfileId", "status");
