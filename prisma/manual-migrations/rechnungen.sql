-- Manuelle Migration fuer das Rechnungen-Modul (Modelle Invoice + InvoiceItem, Bereich Vertrieb).
--
-- WICHTIG: Vor dem Livegang einmalig gegen die Supabase-Postgres-DB ausfuehren
-- (Supabase SQL-Editor), da im Build keine DB-Zugangsdaten vorliegen.
-- Die App faengt eine fehlende Tabelle NICHT automatisch ab (ausser der
-- Uebersichts-KPI, die per .catch(() => 0) abgesichert ist) — diese Migration
-- muss also laufen, bevor der Bereich /rechnungen live geht.
--
-- Idempotent: kann gefahrlos mehrfach ausgefuehrt werden.

-- Rechnung (Kopf-Daten + Kunde)
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id"              TEXT NOT NULL,
    "number"          TEXT NOT NULL,
    "date"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate"         TIMESTAMP(3) NOT NULL,
    "customerCompany" TEXT NOT NULL,
    "customerContact" TEXT NOT NULL DEFAULT '',
    "customerStreet"  TEXT NOT NULL DEFAULT '',
    "customerZip"     TEXT NOT NULL DEFAULT '',
    "customerCity"    TEXT NOT NULL DEFAULT '',
    "customerEmail"   TEXT NOT NULL DEFAULT '',
    "customerPhone"   TEXT NOT NULL DEFAULT '',
    "notes"           TEXT NOT NULL DEFAULT '',
    "total"           DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"          TEXT NOT NULL DEFAULT 'offen',
    "orderId"         TEXT,
    "offerId"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- Rechnungsnummer eindeutig (z. B. RE-2026-001)
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key"
    ON "Invoice" ("number");

-- Einzelne Position innerhalb einer Rechnung
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id"        TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position"  INTEGER NOT NULL,
    "label"     TEXT NOT NULL,
    "quantity"  DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lineTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx"
    ON "InvoiceItem" ("invoiceId");

-- Fremdschluessel Position -> Rechnung (onDelete: Cascade, passend zum Prisma-Schema).
-- In einen DO-Block gepackt, damit ein erneutes Ausfuehren nicht an einem
-- bereits vorhandenen Constraint scheitert.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_invoiceId_fkey'
    ) THEN
        ALTER TABLE "InvoiceItem"
            ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
