/*
  Warnings:

  - You are about to drop the column `linkedAccountId` on the `Campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_linkedAccountId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "linkedAccountId";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "senderAccountId" TEXT;

-- AlterTable
ALTER TABLE "LinkedInAccount" ADD COLUMN     "dailyActionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyCap" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "dailyResetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CampaignSender" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "linkedAccountId" TEXT NOT NULL,

    CONSTRAINT "CampaignSender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedAccountId" TEXT NOT NULL,
    "unipileChatId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetProfileUrl" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "unipileMessageId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isFromMe" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSender_campaignId_linkedAccountId_key" ON "CampaignSender"("campaignId", "linkedAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_unipileMessageId_key" ON "Message"("unipileMessageId");

-- AddForeignKey
ALTER TABLE "CampaignSender" ADD CONSTRAINT "CampaignSender_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSender" ADD CONSTRAINT "CampaignSender_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "LinkedInAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_senderAccountId_fkey" FOREIGN KEY ("senderAccountId") REFERENCES "LinkedInAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_linkedAccountId_fkey" FOREIGN KEY ("linkedAccountId") REFERENCES "LinkedInAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
