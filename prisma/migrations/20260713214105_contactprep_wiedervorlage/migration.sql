-- Wiedervorlage-Felder fuer ContactPrep: automatischer Kalender-Termin,
-- 3 Werktage nachdem eine Firma auf "kontaktiert" wechselt.
ALTER TABLE "ContactPrep" ADD COLUMN "wiedervorlage" TIMESTAMP(3);
ALTER TABLE "ContactPrep" ADD COLUMN "wiedervorlageEventId" TEXT;
