// Gemeinsame Rechnungs-Logik (Status, Faelligkeit).
// Bewusst frei von React/Prisma-Importen, damit Server- und Client-Code
// (Liste, Detail, StatusSelect, PDF) dieselbe Wahrheit nutzen.

// Standard-Zahlungsziel in Tagen (Faelligkeit = Rechnungsdatum + X Tage).
// Passend zu LUMIO_ZAHLUNGSBEDINGUNGEN ("14 Tage netto").
export const LUMIO_ZAHLUNGSZIEL_TAGE = 14;

// Moegliche (gespeicherte) Status-Werte einer Rechnung.
export const INVOICE_STATUS = ["offen", "bezahlt", "ueberfaellig"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

// Anzeige-Beschriftungen der Status.
export const INVOICE_STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  bezahlt: "Bezahlt",
  ueberfaellig: "Überfällig",
};

// Tailwind-Klassen je Status (gleiche Optik wie die uebrigen Badges).
export const INVOICE_STATUS_STYLE: Record<string, string> = {
  offen: "border-line bg-white/5 text-muted",
  bezahlt: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  ueberfaellig: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

// Der tatsaechlich anzuzeigende Status: Eine noch nicht bezahlte Rechnung, deren
// Faelligkeit in der Vergangenheit liegt, gilt als "ueberfaellig" – unabhaengig
// davon, was in der DB steht. Bezahlte Rechnungen bleiben immer "bezahlt".
export function effectiveInvoiceStatus(invoice: {
  status: string;
  dueDate: Date | string;
}): InvoiceStatus {
  if (invoice.status === "bezahlt") return "bezahlt";
  const due = new Date(invoice.dueDate);
  // Vergleich auf Tagesbasis: erst ab dem Tag NACH der Faelligkeit ueberfaellig.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) return "ueberfaellig";
  return "offen";
}
