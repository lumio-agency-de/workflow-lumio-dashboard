-- Manuelle Migration fuer den erzwungenen sicheren Passwort-Wechsel
-- (zwei neue Spalten im Modell User).
--
-- WICHTIG: Vor dem Livegang einmalig gegen die Supabase-Postgres-DB ausfuehren
-- (Supabase SQL-Editor), da im Build keine DB-Zugangsdaten vorliegen und daher
-- `prisma db push` / `prisma migrate deploy` hier nicht laufen konnte.
--
-- Idempotent: Die Spalten werden nur angelegt, falls sie noch nicht existieren.

-- Neue Spalten am Modell User (Tabelle "User")
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- Alle drei Login-Nutzer muessen beim naechsten Login zwangsweise
-- ein neues, sicheres Passwort setzen.
UPDATE "User"
    SET "mustChangePassword" = true
    WHERE username IN ('miko', 'nevio', 'info');
