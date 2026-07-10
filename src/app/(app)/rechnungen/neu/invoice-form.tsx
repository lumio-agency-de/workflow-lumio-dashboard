"use client";

// Interaktives Rechnungs-Formular (laeuft im Browser).
// Aufbau analog zum Angebots-Formular, mit "Fällig bis" statt "Gültig bis" und
// optionaler Vorbefuellung aus Auftrag/Angebot.
import { useMemo, useState, useTransition } from "react";
import { createInvoice } from "../actions";
import { formatEuro } from "@/lib/format";

// Vereinfachtes Paket fuer die Auswahl
type PackageOption = { id: string; name: string; defaultPrice: number };

// Eine Zeile im Positions-Editor
type Row = {
  key: number; // interner Schluessel fuer React
  packageId: string; // "" = freie Position
  label: string;
  quantity: string; // als Text, damit Tippen angenehm ist
  unitPrice: string;
};

// Vorbefuellung (aus Auftrag/Angebot), vom Server uebergeben
export type InvoiceFormInitial = {
  customer: {
    customerCompany: string;
    customerContact: string;
    customerStreet: string;
    customerZip: string;
    customerCity: string;
    customerEmail: string;
    customerPhone: string;
  };
  notes: string;
  items: { label: string; quantity: string; unitPrice: string }[];
  orderId?: string;
  offerId?: string;
  origin: string; // z. B. 'Auftrag „…“' – nur zur Anzeige
};

// Text wie "1.234,50" oder "1234.5" in eine Zahl wandeln
function parseNum(value: string): number {
  const raw = value.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";
const labelClass = "flex flex-col gap-1 text-sm font-medium";

let nextKey = 1; // fortlaufender Zeilen-Schluessel

export default function InvoiceForm({
  packages,
  defaultNumber,
  defaultDate,
  defaultDueDate,
  initial,
}: {
  packages: PackageOption[];
  defaultNumber: string;
  defaultDate: string;
  defaultDueDate: string;
  initial: InvoiceFormInitial;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Rechnungsdaten
  const [number, setNumber] = useState(defaultNumber);
  const [date, setDate] = useState(defaultDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  // Kundendaten (ggf. vorbefuellt)
  const [customer, setCustomer] = useState(initial.customer);

  // Notizfeld (ggf. vorbefuellt)
  const [notes, setNotes] = useState(initial.notes);

  // Positionen – aus der Vorbefuellung oder mit einer leeren Zeile starten
  const [rows, setRows] = useState<Row[]>(() =>
    initial.items.length > 0
      ? initial.items.map((i) => ({
          key: nextKey++,
          packageId: "",
          label: i.label,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
      : [
          {
            key: nextKey++,
            packageId: "",
            label: "",
            quantity: "1",
            unitPrice: "",
          },
        ]
  );

  // Gesamtsumme live berechnen
  const total = useMemo(
    () =>
      rows.reduce(
        (sum, r) => sum + parseNum(r.quantity) * parseNum(r.unitPrice),
        0
      ),
    [rows]
  );

  // Eine Zeile aktualisieren
  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Paketauswahl in einer Zeile: Bezeichnung und Preis vorbefuellen
  function onSelectPackage(key: number, packageId: string) {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      updateRow(key, {
        packageId,
        label: pkg.name,
        unitPrice: String(pkg.defaultPrice),
      });
    } else {
      updateRow(key, { packageId: "" });
    }
  }

  // Neue leere Position hinzufuegen
  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: nextKey++, packageId: "", label: "", quantity: "1", unitPrice: "" },
    ]);
  }

  // Position entfernen
  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  // Formular absenden
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customer.customerCompany.trim()) {
      setError("Bitte einen Kunden-/Firmennamen angeben.");
      return;
    }

    const items = rows
      .map((r) => ({
        label: r.label.trim(),
        quantity: parseNum(r.quantity),
        unitPrice: parseNum(r.unitPrice),
      }))
      .filter((i) => i.label !== "");

    if (items.length === 0) {
      setError("Bitte mindestens eine Position mit Bezeichnung hinzufuegen.");
      return;
    }

    startTransition(async () => {
      try {
        await createInvoice({
          number,
          date,
          dueDate,
          ...customer,
          notes,
          items,
          orderId: initial.orderId,
          offerId: initial.offerId,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Beim Speichern ist ein Fehler aufgetreten."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Neue Rechnung</h1>

      {/* Hinweis auf die Herkunft (Auftrag/Angebot) */}
      {initial.origin ? (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-2">
          Vorbefüllt aus {initial.origin}. Bitte Positionen und Kundendaten
          prüfen.
        </p>
      ) : null}

      {/* --- Kundendaten --- */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-semibold">Kundendaten</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Firmenname / Name *
            <input
              className={inputClass}
              value={customer.customerCompany}
              onChange={(e) =>
                setCustomer({ ...customer, customerCompany: e.target.value })
              }
              required
            />
          </label>
          <label className={labelClass}>
            Ansprechpartner
            <input
              className={inputClass}
              value={customer.customerContact}
              onChange={(e) =>
                setCustomer({ ...customer, customerContact: e.target.value })
              }
            />
          </label>
          <label className={labelClass}>
            Straße + Hausnummer
            <input
              className={inputClass}
              value={customer.customerStreet}
              onChange={(e) =>
                setCustomer({ ...customer, customerStreet: e.target.value })
              }
            />
          </label>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <label className={labelClass}>
              PLZ
              <input
                className={inputClass}
                value={customer.customerZip}
                onChange={(e) =>
                  setCustomer({ ...customer, customerZip: e.target.value })
                }
              />
            </label>
            <label className={labelClass}>
              Ort
              <input
                className={inputClass}
                value={customer.customerCity}
                onChange={(e) =>
                  setCustomer({ ...customer, customerCity: e.target.value })
                }
              />
            </label>
          </div>
          <label className={labelClass}>
            E-Mail (optional)
            <input
              type="email"
              className={inputClass}
              value={customer.customerEmail}
              onChange={(e) =>
                setCustomer({ ...customer, customerEmail: e.target.value })
              }
            />
          </label>
          <label className={labelClass}>
            Telefon (optional)
            <input
              className={inputClass}
              value={customer.customerPhone}
              onChange={(e) =>
                setCustomer({ ...customer, customerPhone: e.target.value })
              }
            />
          </label>
        </div>
      </section>

      {/* --- Rechnungsdaten --- */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-semibold">Rechnungsdaten</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Rechnungsnummer
            <input
              className={inputClass}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Rechnungsdatum
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Fällig bis
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* --- Positionen --- */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-semibold">Positionen</h2>

        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const lineTotal = parseNum(row.quantity) * parseNum(row.unitPrice);
            return (
              <div
                key={row.key}
                className="grid items-end gap-2 rounded-xl border border-line p-3 md:grid-cols-[1fr_1fr_80px_120px_110px_auto]"
              >
                {/* Paketauswahl */}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                  Paket
                  <select
                    className={inputClass}
                    value={row.packageId}
                    onChange={(e) => onSelectPackage(row.key, e.target.value)}
                  >
                    <option value="">– Freie Position –</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Bezeichnung */}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                  Bezeichnung
                  <input
                    className={inputClass}
                    value={row.label}
                    onChange={(e) =>
                      updateRow(row.key, { label: e.target.value })
                    }
                    placeholder="Leistung"
                  />
                </label>

                {/* Menge */}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                  Menge
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(row.key, { quantity: e.target.value })
                    }
                  />
                </label>

                {/* Einzelpreis */}
                <label className="flex flex-col gap-1 text-xs font-medium text-muted">
                  Einzelpreis €
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={row.unitPrice}
                    onChange={(e) =>
                      updateRow(row.key, { unitPrice: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </label>

                {/* Positions-Gesamt (nur Anzeige) */}
                <div className="flex flex-col gap-1 text-xs font-medium text-muted">
                  Gesamt
                  <div className="rounded-lg bg-white/[0.05] px-3 py-2 text-sm font-semibold tabular-nums">
                    {formatEuro(lineTotal)}
                  </div>
                </div>

                {/* Entfernen */}
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="rounded-lg px-2 py-2 text-sm text-rose-400 hover:bg-rose-400/10"
                  title="Position entfernen"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition hover:bg-white/5"
        >
          + Position hinzufügen
        </button>

        {/* Gesamtsumme */}
        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <div className="text-right">
            <div className="text-sm text-muted">Rechnungsbetrag (netto)</div>
            <div className="text-2xl font-bold tabular-nums">
              {formatEuro(total)}
            </div>
            <div className="text-xs text-muted">
              Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
            </div>
          </div>
        </div>
      </section>

      {/* --- Notizen --- */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-4 font-semibold">Anmerkungen (optional)</h2>
        <textarea
          className={inputClass + " min-h-24"}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Individuelle Anmerkungen, die auf der Rechnung erscheinen sollen."
        />
      </section>

      {/* Fehlermeldung */}
      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Absenden */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="glow-accent rounded-xl bg-accent px-6 py-2.5 font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
        >
          {isPending ? "Wird gespeichert …" : "Rechnung speichern & PDF erstellen"}
        </button>
      </div>
    </form>
  );
}
