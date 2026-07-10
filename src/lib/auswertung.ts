// Auswertungs-/Reporting-Logik: buendelt die Kennzahlen fuer die Seite
// /auswertung an EINER Stelle, damit die Seite selbst nur noch anzeigt.
//
// WICHTIG zum "Umsatz": Es gibt (noch) KEIN Rechnungs-/Invoice-Modell.
// Der Umsatz ist deshalb bewusst ein PROXY, zusammengesetzt aus zwei
// unabhaengigen Quellen, die im Datenmodell nicht verknuepft sind:
//   1. angenommene Angebote (Offer.status = "angenommen") -> gewonnener Wert
//   2. erledigte Auftraege   (Order.status = "erledigt")  -> abgeschlossene Arbeit
// Beide werden getrennt ausgewiesen (nicht vermischt), damit die Zahl ehrlich
// bleibt. Sobald es echte Rechnungen gibt, laesst sich `computeUmsatz` um eine
// dritte Quelle erweitern, ohne die Seite umzubauen (siehe UMSATZ_QUELLEN).
import { toDateInputValue } from "@/lib/format";

// Minimal noetige Felder – bewusst schmal gehalten, damit die Funktionen auch
// mit Teil-Selects aufrufbar sind.
export type OrderLike = { status: string; value: number; createdAt: Date };
export type OfferLike = {
  status: string;
  total: number;
  date: Date;
};

// Ein Monatskuebel des Umsatz-Proxys.
export type UmsatzMonat = {
  key: string; // "2026-07" (Berliner Zeit) – stabile Sortierung
  label: string; // "Jul 26" – fuer die Achse
  angenommen: number; // Summe angenommener Angebote in diesem Monat
  auftraege: number; // Summe erledigter Auftraege in diesem Monat
  gesamt: number; // angenommen + auftraege (Proxy-Summe)
};

export type UmsatzReport = {
  monate: UmsatzMonat[];
  gesamtAngenommen: number;
  gesamtAuftraege: number;
  gesamt: number; // Proxy-Gesamtumsatz ueber den Zeitraum
  maxMonat: number; // groesster Monatswert (fuer die Balken-Skalierung)
};

// Beschreibung der Umsatz-Quellen (fuer Legende + spaetere Erweiterung).
// Neue Quelle (z. B. "rechnungen") hier ergaenzen und in computeUmsatz fuellen.
export const UMSATZ_QUELLEN = [
  { key: "angenommen", label: "Angenommene Angebote", farbe: "text-accent" },
  { key: "auftraege", label: "Erledigte Aufträge", farbe: "text-emerald-400" },
] as const;

// Jahr-Monats-Schluessel in Berliner Zeit, z. B. "2026-07".
function monatsSchluessel(d: Date): string {
  return toDateInputValue(d).slice(0, 7);
}

// Die letzten `anzahl` Monate (inkl. aktuellem) als leere Kuebel vorbereiten,
// damit auch Monate ohne Umsatz als Luecke sichtbar sind.
function letzteMonate(anzahl: number): UmsatzMonat[] {
  const heute = new Date();
  const out: UmsatzMonat[] = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    const d = new Date(heute.getFullYear(), heute.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      new Intl.DateTimeFormat("de-DE", { month: "short" }).format(d) +
      " " +
      String(d.getFullYear()).slice(2);
    out.push({ key, label, angenommen: 0, auftraege: 0, gesamt: 0 });
  }
  return out;
}

// Umsatz-Proxy ueber die letzten `monate` Monate berechnen.
export function computeUmsatz(
  orders: OrderLike[],
  offers: OfferLike[],
  monate = 6
): UmsatzReport {
  const kuebel = letzteMonate(monate);
  const index = new Map(kuebel.map((m) => [m.key, m]));

  // Quelle 1: angenommene Angebote, nach Angebotsdatum einsortiert
  for (const o of offers) {
    if (o.status !== "angenommen") continue;
    const m = index.get(monatsSchluessel(o.date));
    if (m) m.angenommen += o.total || 0;
  }

  // Quelle 2: erledigte Auftraege, nach Anlegedatum einsortiert
  for (const o of orders) {
    if (o.status !== "erledigt") continue;
    const m = index.get(monatsSchluessel(o.createdAt));
    if (m) m.auftraege += o.value || 0;
  }

  let gesamtAngenommen = 0;
  let gesamtAuftraege = 0;
  let maxMonat = 0;
  for (const m of kuebel) {
    m.gesamt = m.angenommen + m.auftraege;
    gesamtAngenommen += m.angenommen;
    gesamtAuftraege += m.auftraege;
    if (m.gesamt > maxMonat) maxMonat = m.gesamt;
  }

  return {
    monate: kuebel,
    gesamtAngenommen,
    gesamtAuftraege,
    gesamt: gesamtAngenommen + gesamtAuftraege,
    maxMonat,
  };
}

// Pipeline-Wert: Summe aller offenen Angebote (noch nicht entschieden).
export function computePipeline(offers: OfferLike[]): {
  wert: number;
  anzahl: number;
} {
  const offen = offers.filter((o) => o.status === "offen");
  return {
    wert: offen.reduce((s, o) => s + (o.total || 0), 0),
    anzahl: offen.length,
  };
}

// Conversion: wie viele Angebote wurden angenommen (von allen entschiedenen).
export type ConversionReport = {
  gesamt: number; // alle Angebote
  angenommen: number;
  abgelehnt: number;
  offen: number;
  quote: number; // 0..100, angenommen / (angenommen + abgelehnt)
};

export function computeConversion(offers: OfferLike[]): ConversionReport {
  const angenommen = offers.filter((o) => o.status === "angenommen").length;
  const abgelehnt = offers.filter((o) => o.status === "abgelehnt").length;
  const offen = offers.filter((o) => o.status === "offen").length;
  const entschieden = angenommen + abgelehnt;
  return {
    gesamt: offers.length,
    angenommen,
    abgelehnt,
    offen,
    quote: entschieden > 0 ? Math.round((angenommen / entschieden) * 100) : 0,
  };
}

// Akquise-Funnel: Anzahl der Prospects je Pipeline-Status, in fester Reihenfolge.
export const FUNNEL_STUFEN = [
  { key: "neu", label: "Neu" },
  { key: "kontaktiert", label: "Kontaktiert" },
  { key: "interesse", label: "Interesse" },
  { key: "termin", label: "Termin" },
  { key: "erledigt", label: "Erledigt" },
] as const;

export type FunnelStufe = { key: string; label: string; anzahl: number };

// Erwartet eine Liste { status } (oder ein Zaehl-Objekt) und ordnet sie in die
// feste Stufen-Reihenfolge ein. Unbekannte Status werden ignoriert.
export function computeFunnel(
  counts: Record<string, number>
): { stufen: FunnelStufe[]; max: number } {
  const stufen = FUNNEL_STUFEN.map((s) => ({
    key: s.key,
    label: s.label,
    anzahl: counts[s.key] ?? 0,
  }));
  const max = stufen.reduce((m, s) => Math.max(m, s.anzahl), 0);
  return { stufen, max };
}
