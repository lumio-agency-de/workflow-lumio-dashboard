-- Manuelle Migration fuer den Akquise-Abschluss (Bereich Kontaktiert -> Vertrieb).
--
-- Erweitert das Modell ContactPrep um:
--   * ergebnis             – Unterkategorie im Bereich "Kontaktiert":
--                            offen | erfolgreich | nicht_erfolgreich
--   * preislisteGesendetAm – Zeitpunkt, an dem die oeffentliche Preisliste
--                            per info@ verschickt wurde (vor dem Angebot)
--   * angebotId            – Offer.id des daraus erzeugten Angebots
--   * angebotNummer        – Angebotsnummer fuer die Anzeige (z. B. ANG-2026-003)
--
-- WICHTIG: Einmalig gegen die Supabase-Postgres-DB ausfuehren (Supabase
-- SQL-Editor), da im Build keine DB-Zugangsdaten vorliegen. Bis dahin faellt
-- der Bereich /kontaktiert auf die DbUnavailable-Anzeige zurueck (kein Crash).

ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "ergebnis"             TEXT NOT NULL DEFAULT 'offen';
ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "preislisteGesendetAm" TIMESTAMP(3);
ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "angebotId"            TEXT;
ALTER TABLE "ContactPrep" ADD COLUMN IF NOT EXISTS "angebotNummer"        TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "ContactPrep_ergebnis_idx" ON "ContactPrep" ("ergebnis");

-- Bereits kontaktierte Firmen starten in der Unterkategorie "offen"
-- (angeschrieben, aber noch keine Rueckmeldung bewertet).
UPDATE "ContactPrep"
SET "ergebnis" = 'offen'
WHERE "status" = 'kontaktiert'
  AND ("ergebnis" IS NULL OR "ergebnis" = '');
