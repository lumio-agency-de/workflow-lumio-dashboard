-- Manuelle Migration fuer den Akquise-Pipeline-Umbau (Bereich Akquise).
--
-- Erweitert das Modell ContactPrep um:
--   * branche        – Branchen-Filter + Sammel-Entwuerfe je Branche
--   * mailEntwurfAm  – Zeitpunkt, an dem der Gmail-Entwurf (info@) erstellt wurde
--   * mailGesendetAm – vom Gmail-Sent-Abgleich erkannter Versandzeitpunkt
--
-- WICHTIG: Einmalig gegen die Supabase-Postgres-DB ausfuehren (Supabase
-- SQL-Editor), da im Build keine DB-Zugangsdaten vorliegen. Danach zeigen die
-- Bereiche /kontakt-vorbereitung und /kontaktiert die Branche/Status korrekt an.

ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "branche"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "mailEntwurfAm"  TIMESTAMP(3);
ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "mailGesendetAm" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ContactPrep_branche_idx" ON "ContactPrep" ("branche");

-- Bestehende Vorbereitungen ruecken die Branche aus ihrem Ursprungs-Prospect nach.
UPDATE "ContactPrep" cp
SET "branche" = p."branche"
FROM "Prospect" p
WHERE cp."prospectId" = p."id"
  AND (cp."branche" IS NULL OR cp."branche" = '');
