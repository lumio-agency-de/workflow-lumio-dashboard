// Rechnet eine Wanduhrzeit in der deutschen Zeitzone (Europe/Berlin, MEZ/MESZ)
// in den korrekten UTC-Zeitpunkt um. Noetig, weil der Server (Vercel) in UTC
// laeuft und "17:00" sonst faelschlich als 17:00 UTC statt als 17:00 Ortszeit
// interpretiert wuerde.
const TIME_ZONE = "Europe/Berlin";

export function berlinTimeToUtc(dateStr: string, timeStr: string): Date {
  // Eingabe zunaechst so behandeln, als waere sie bereits UTC (Referenzpunkt)
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);

  // Diesen Zeitpunkt in der Zielzone formatieren, um die aktuelle Verschiebung
  // (inkl. Sommer-/Winterzeit) zu ermitteln
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(naiveUtc)
    .reduce((acc: Record<string, string>, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asUtcAgain = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "00" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  const offsetMs = asUtcAgain - naiveUtc.getTime();
  return new Date(naiveUtc.getTime() - offsetMs);
}
