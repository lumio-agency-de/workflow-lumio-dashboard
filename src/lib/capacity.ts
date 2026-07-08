// Kapazitaets-Analyse: Wie ausgelastet ist Lumio gerade?
// Kombiniert die Termindichte der naechsten 14 Tage mit den offenen Auftraegen.
import type { CalEvent } from "@/lib/types";

export type Capacity = {
  level: "frei" | "knapp" | "voll"; // Ampelstufe
  label: string; // Anzeigetext
  hint: string; // Detailtext (Termine/Std./Auftraege)
  busyHours: number;
  eventCount: number;
  openOrders: number;
};

export function computeCapacity(
  events: CalEvent[],
  openOrders: number
): Capacity {
  const now = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);

  // Belegte Stunden in den naechsten 14 Tagen zusammenzaehlen
  let busyHours = 0;
  let eventCount = 0;
  for (const e of events) {
    const start = new Date(e.start);
    if (start < now || start > end) continue;
    eventCount++;
    if (e.allDay) {
      busyHours += 4; // Ganztagestermin pauschal als halber Arbeitstag
    } else {
      const dur = (new Date(e.end).getTime() - start.getTime()) / 3600000;
      busyHours += Math.min(Math.max(dur, 0), 8); // pro Termin max. 8 Std. zaehlen
    }
  }

  // 14 Tage = ca. 10 Arbeitstage a 8 Std. = 80 Std. Gesamtkapazitaet
  const calendarRatio = Math.min(busyHours / 80, 1);
  // Ab 6 parallel laufenden Auftraegen gilt: voll
  const ordersRatio = Math.min(openOrders / 6, 1);

  // Gewichtung: Kalender zaehlt staerker als die Auftragszahl
  const score = 0.6 * calendarRatio + 0.4 * ordersRatio;

  const level: Capacity["level"] =
    score < 0.45 ? "frei" : score < 0.75 ? "knapp" : "voll";

  const labels: Record<Capacity["level"], string> = {
    frei: "Kapazität frei",
    knapp: "Kapazität knapp",
    voll: "Ausgelastet",
  };

  return {
    level,
    label: labels[level],
    hint: `${eventCount} Termine / ${Math.round(busyHours)} Std. in 14 Tagen · ${openOrders} offene Aufträge`,
    busyHours,
    eventCount,
    openOrders,
  };
}
