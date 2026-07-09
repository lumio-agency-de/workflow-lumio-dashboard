// Kleine Hilfsfunktionen zum einheitlichen Anzeigen von Geld und Datum.
// Alle Datums-/Zeit-Ausgaben verwenden bewusst die deutsche Zeitzone
// (Europe/Berlin). Sonst wuerde der Server (Vercel laeuft in UTC) andere
// Uhrzeiten anzeigen als der Browser des Nutzers – genau das fuehrte dazu,
// dass auf der Uebersicht UTC-Zeiten statt der echten Ortszeit standen.
const TIME_ZONE = "Europe/Berlin";

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
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Datum als YYYY-MM-DD (in Berliner Zeit) fuer <input type="date"> aufbereiten
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // en-CA liefert das Format YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Uhrzeit als HH:MM (in Berliner Zeit) fuer <input type="time"> aufbereiten
export function toTimeInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Uhrzeit ausgeben, z. B. "10:00"
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Kurzes Tagesdatum mit Wochentag, z. B. "Mi, 02.07."
export function formatDayShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
}

// Ist das Datum heute? (bezogen auf die deutsche Zeitzone)
export function isToday(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d) === fmt.format(new Date());
}
