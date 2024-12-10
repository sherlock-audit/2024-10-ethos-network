-- CreateTable
CREATE TABLE "user_fcm_tokens" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_fcm_tokens_profileId_idx" ON "user_fcm_tokens"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "user_fcm_tokens_profileId_fcmToken_key" ON "user_fcm_tokens"("profileId", "fcmToken");

-- AddForeignKey
ALTER TABLE "user_fcm_tokens" ADD CONSTRAINT "user_fcm_tokens_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
