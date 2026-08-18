-- Spuren (Website / Anzeigen) fuer die Lead-Liste, 18.08.2026
--
-- Warum: Eine Firma kann gleichzeitig Website-Lead UND Anzeigen-Lead sein
-- (erst Website verkaufen, spaeter Anzeigen an denselben Kunden). Mit nur
-- einem Status je Prospect wuerde "erledigt" aus dem Website-Verkauf die Firma
-- auch aus der Anzeigen-Liste entfernen. Deshalb: CRM-Status je Spur.
--
-- Ausfuehren im Supabase SQL-Editor. Rein additiv, nichts wird geloescht:
-- die alten Prospect-Spalten bleiben als Sicherung stehen.

-- 1) Bewertungsfelder fuer die Anzeigen-Spur am Prospect
ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "mitarbeiter" INTEGER;
ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "schaltetAnzeigen" TEXT NOT NULL DEFAULT 'unbekannt';
ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "anzeigenGeprueftAm" TIMESTAMP(3);
ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "kapazitaetNotiz" TEXT NOT NULL DEFAULT '';

-- 2) Spur-Tabelle
CREATE TABLE IF NOT EXISTS "ProspectTrack" (
  "id"              TEXT NOT NULL,
  "prospectId"      TEXT NOT NULL,
  "spur"            TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'neu',
  "ansprechpartner" TEXT NOT NULL DEFAULT '',
  "kontaktiertAm"   TIMESTAMP(3),
  "reaktion"        TEXT NOT NULL DEFAULT '',
  "wiedervorlage"   TIMESTAMP(3),
  "notiz"           TEXT NOT NULL DEFAULT '',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProspectTrack_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ProspectTrack"
    ADD CONSTRAINT "ProspectTrack_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ProspectTrack_prospectId_spur_key"
  ON "ProspectTrack" ("prospectId", "spur");
CREATE INDEX IF NOT EXISTS "ProspectTrack_spur_status_idx"
  ON "ProspectTrack" ("spur", "status");

-- 3) Bestand uebernehmen: fuer jede Firma eine Website-Spur aus den
--    bisherigen CRM-Feldern. Laeuft nur, wo noch keine Zeile existiert,
--    ist also mehrfach ausfuehrbar.
INSERT INTO "ProspectTrack"
  ("id", "prospectId", "spur", "status", "ansprechpartner",
   "kontaktiertAm", "reaktion", "wiedervorlage", "notiz",
   "createdAt", "updatedAt")
SELECT
  'seed_web_' || p."id",
  p."id",
  'website',
  p."status",
  p."ansprechpartner",
  p."kontaktiertAm",
  p."reaktion",
  p."wiedervorlage",
  p."notiz",
  p."createdAt",
  CURRENT_TIMESTAMP
FROM "Prospect" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProspectTrack" t
  WHERE t."prospectId" = p."id" AND t."spur" = 'website'
);

-- Kontrolle:
-- SELECT spur, status, count(*) FROM "ProspectTrack" GROUP BY 1,2 ORDER BY 1,2;
