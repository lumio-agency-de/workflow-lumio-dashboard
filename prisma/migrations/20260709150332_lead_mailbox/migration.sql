-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "mailboxEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mailboxUserId" TEXT;
