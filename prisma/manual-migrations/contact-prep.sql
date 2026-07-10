-- Manuelle Migration fuer die Kontakt-Vorbereitung (Modell ContactPrep, Bereich Akquise).
--
-- WICHTIG: Vor dem Livegang einmalig gegen die Supabase-Postgres-DB ausfuehren
-- (Supabase SQL-Editor), da im Build keine DB-Zugangsdaten vorliegen.
-- Die App faengt eine fehlende Tabelle nicht automatisch ab — diese Migration
-- muss also laufen, bevor der Bereich /kontakt-vorbereitung live geht.

CREATE TABLE IF NOT EXISTS "ContactPrep" (
    "id"                   TEXT NOT NULL,
    "prospectId"           TEXT,
    "firma"                TEXT NOT NULL,
    "ort"                  TEXT NOT NULL DEFAULT '',
    "telefon"              TEXT NOT NULL DEFAULT '',
    "email"                TEXT NOT NULL DEFAULT '',
    "website"              TEXT NOT NULL DEFAULT '',
    "ansprechpartner"      TEXT NOT NULL DEFAULT '',
    "websiteStatus"        TEXT NOT NULL DEFAULT 'unbekannt',
    "websiteMaengel"       TEXT NOT NULL DEFAULT '',
    "empfohleneLeistungen" TEXT NOT NULL DEFAULT '',
    "kanal"                TEXT NOT NULL DEFAULT 'telefon',
    "status"               TEXT NOT NULL DEFAULT 'offen',
    "notiz"                TEXT NOT NULL DEFAULT '',
    "erstelltVon"          TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPrep_pkey" PRIMARY KEY ("id")
);

-- 1:1 zu Prospect (ein Prospect -> hoechstens eine Vorbereitung)
CREATE UNIQUE INDEX IF NOT EXISTS "ContactPrep_prospectId_key"
    ON "ContactPrep" ("prospectId");

CREATE INDEX IF NOT EXISTS "ContactPrep_status_idx"
    ON "ContactPrep" ("status");

-- Fremdschluessel auf Prospect (onDelete: SetNull, passend zum Prisma-Schema)
ALTER TABLE "ContactPrep"
    ADD CONSTRAINT "ContactPrep_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
