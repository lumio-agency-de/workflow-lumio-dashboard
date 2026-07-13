-- Manuelle Migration: Prospect.email (Bereich Leads/Akquise).
--
-- Der leadgen-Runner (11880 via JSON-LD) erfasst jetzt E-Mail-Adressen und
-- schreibt sie beim Sync in Prospect.email. Von dort wird die Adresse beim
-- Uebernehmen in die Kontakt-Vorbereitung als Startwert nach ContactPrep.email
-- kopiert — spart das manuelle Heraussuchen der Mailadresse.
--
-- Einmalig im Supabase-SQL-Editor gegen die Produktions-DB ausfuehren.

ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL DEFAULT '';
