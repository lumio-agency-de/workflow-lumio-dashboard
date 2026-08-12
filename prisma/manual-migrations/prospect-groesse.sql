-- Manuelle Migration: Prospect.groesse (Bereich Leads/Akquise).
--
-- Das leadgen schaetzt seit 11.08.2026 die Betriebsgroesse (checks/groesse.py:
-- Mitarbeiterzahl im Text, sonst Indizien wie Rechtsform, Karriereseite,
-- mehrere Standorte, Datenschutzbeauftragter, ISO-Zertifikat).
-- Werte: "klein" | "mittel" | "gross" | "" (unbekannt).
--
-- Wozu: Lumio faehrt zweigleisig — Handwerk/Dienstleister als Mengengeschaeft,
-- daneben Betriebe mit Budget. Ohne diese Spalte landen beide Zielgruppen
-- unsortiert in derselben Liste.
--
-- Reihenfolge egal: leadgen/db.py schreibt die Spalte nur, wenn es sie gibt
-- (siehe _OPTIONALE_SPALTEN) — der Runner laeuft also auch ohne diese
-- Migration weiter, dann bleibt das Feld im Dashboard nur leer.
--
-- Einmalig im Supabase-SQL-Editor gegen die Produktions-DB ausfuehren.

ALTER TABLE "Prospect" ADD COLUMN IF NOT EXISTS "groesse" TEXT NOT NULL DEFAULT '';
