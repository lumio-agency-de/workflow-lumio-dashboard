-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mailId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL DEFAULT '',
    "mailDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'neu',
    "emailDraft" TEXT NOT NULL DEFAULT '',
    "sentAt" DATETIME,
    "offerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL DEFAULT 'nicht_erreicht',
    "notes" TEXT NOT NULL DEFAULT '',
    "nextStep" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_mailId_key" ON "Lead"("mailId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_offerId_key" ON "Lead"("offerId");
