// Kleine Hilfsfunktionen zum einheitlichen Anzeigen von Geld und Datum.

// Zahl als Euro-Betrag im deutschen Format ausgeben, z. B. 1234.5 -> "1.234,50 €"
export function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

// Datum im deutschen Format ausgeben, z. B. "30.06.2026"
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Datum als YYYY-MM-DD fuer <input type="date"> aufbereiten
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

// Uhrzeit als HH:MM (lokale Zeit) fuer <input type="time"> aufbereiten
export function toTimeInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Uhrzeit ausgeben, z. B. "10:00"
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Kurzes Tagesdatum mit Wochentag, z. B. "Mi, 02.07."
export function formatDayShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

// Ist das Datum heute?
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
