-- Manuelle Migration fuer den internen Chat (Modell ChatMessage).
--
-- WICHTIG: Diese Migration muss VOR dem Livegang einmalig gegen die
-- Supabase-Postgres-Datenbank ausgefuehrt werden (z. B. im Supabase SQL-Editor),
-- da im Build-Prozess keine Supabase-Zugangsdaten vorliegen und daher
-- `prisma db push` / `prisma migrate deploy` hier nicht laufen konnte.
--
-- Die App faengt eine fehlende Tabelle ab (try/catch -> leere Liste),
-- crasht also nicht, zeigt aber erst nach dieser Migration echte Nachrichten an.

CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id"          TEXT NOT NULL,
    "senderId"    TEXT NOT NULL,
    "scope"       TEXT NOT NULL,
    "recipientId" TEXT,
    "body"        TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- Index passend zu @@index([scope, recipientId, senderId, createdAt])
CREATE INDEX IF NOT EXISTS "ChatMessage_scope_recipientId_senderId_createdAt_idx"
    ON "ChatMessage" ("scope", "recipientId", "senderId", "createdAt");

-- Fremdschluessel auf User (onDelete: Cascade, passend zum Prisma-Schema)
ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage"
    ADD CONSTRAINT "ChatMessage_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
