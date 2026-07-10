// Reine Priorisierung fuer die "Heute dran"-Liste (KEINE KI).
// Regel: faellige Wiedervorlage zuerst, dann hoher Lead-Score, Status
// "interesse"/"kontaktiert" gewichtet, "erledigt"/"kein_interesse" raus.

export type HeuteDranInput = {
  status: string;
  leadScore: number;
  wiedervorlage: Date | null;
};

// Prospects, die grundsaetzlich nicht mehr angegangen werden.
const RAUS = new Set(["erledigt", "kein_interesse"]);

// Ist die Wiedervorlage heute (oder frueher) faellig?
export function istFaellig(w: Date | null, now: Date): boolean {
  if (!w) return false;
  const ende = new Date(now);
  ende.setHours(23, 59, 59, 999);
  return w.getTime() <= ende.getTime();
}

// Numerische Prioritaet – hoeher = dringender.
export function heuteDranPrio(p: HeuteDranInput, now: Date): number {
  let score = p.leadScore; // Basis: heisser Lead = wichtiger
  if (istFaellig(p.wiedervorlage, now)) score += 1000; // faellig schlaegt alles
  if (p.status === "interesse") score += 400;
  else if (p.status === "kontaktiert") score += 200;
  return score;
}

// Kurzer Grund fuer die Anzeige, warum der Lead heute dran ist.
export function heuteDranGrund(p: HeuteDranInput, now: Date): string {
  if (istFaellig(p.wiedervorlage, now)) return "Wiedervorlage fällig";
  if (p.status === "interesse") return "Interesse – dranbleiben";
  if (p.status === "kontaktiert") return "Kontaktiert – nachfassen";
  if (p.leadScore >= 70) return "Heißer Lead";
  return "Neuer Lead";
}

// Filtert, sortiert und schneidet auf die Top-N zu.
export function rankHeuteDran<T extends HeuteDranInput>(
  prospects: T[],
  now: Date,
  limit = 8
): T[] {
  return prospects
    .filter((p) => !RAUS.has(p.status))
    .sort((a, b) => heuteDranPrio(b, now) - heuteDranPrio(a, now))
    .slice(0, limit);
}
