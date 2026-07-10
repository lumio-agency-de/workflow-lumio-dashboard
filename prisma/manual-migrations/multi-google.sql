-- Manuelle Migration: MEHRERE Google-Konten pro Nutzer erlauben.
--
-- Bisher war GoogleAccount.userId @unique, d. h. jeder Dashboard-Nutzer konnte
-- HOECHSTENS EIN Google-Konto verbinden. Fuer die Nutzer-Einstellungen soll ein
-- Nutzer mehrere Postfaecher (z. B. persoenlich + zusaetzliche Adresse) verbinden
-- koennen. Dazu faellt der Unique-Index weg; stattdessen kommt ein normaler
-- (nicht-eindeutiger) Index auf userId, damit die Abfragen schnell bleiben.
--
-- WICHTIG: Diese Migration muss VOR dem Livegang einmalig gegen die
-- Supabase-Postgres-Datenbank ausgefuehrt werden (Supabase SQL-Editor), da im
-- Build-Prozess keine Supabase-Zugangsdaten vorliegen und daher
-- `prisma migrate deploy` hier nicht laufen konnte.
--
-- Der Index-Name "GoogleAccount_userId_key" stammt aus der init-Migration
-- (prisma/migrations/20260708205630_init/migration.sql).

-- 1) Bestehenden Unique-Index entfernen (falls vorhanden)
DROP INDEX IF EXISTS "GoogleAccount_userId_key";

-- 2) Normalen Index fuer schnelle Abfragen nach userId anlegen (passend zu @@index([userId]))
CREATE INDEX IF NOT EXISTS "GoogleAccount_userId_idx" ON "GoogleAccount"("userId");
