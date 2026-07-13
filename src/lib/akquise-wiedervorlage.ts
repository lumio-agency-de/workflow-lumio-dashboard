// Automatische Wiedervorlage fuer die Akquise: Sobald eine Firma (ContactPrep)
// auf "kontaktiert" wechselt, legen wir 3 Werktage spaeter einen Kalender-Termin
// an ("nochmal anrufen/schreiben"), damit der Lead nicht in Vergessenheit geraet.
// Nur serverseitig verwenden (Google-Kalender-Zugriff).
import { prisma } from "@/lib/prisma";
import { getGoogleClientForUser } from "@/lib/google/client";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google/calendar";

// Wie viele Tage nach dem Erstkontakt erinnert werden soll.
const WIEDERVORLAGE_TAGE = 3;

// Einen Tag auf ein "YYYY-MM-DD"-Datum addieren (fuer das – bei Google
// exklusive – Ende eines Ganztagestermins).
function naechsterTag(datum: string): string {
  const [y, m, d] = datum.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Datum X Tage nach dem Basisdatum als "YYYY-MM-DD" (in Berliner Ortszeit).
// Faellt das Ergebnis auf einen Samstag oder Sonntag, wird auf den folgenden
// Montag geschoben. Gerechnet wird auf UTC-Mittag, damit Sommer-/Winterzeit die
// Datumsgrenze nie kippt.
export function wiedervorlageDatum(basis: Date, tage: number = WIEDERVORLAGE_TAGE): string {
  // Kalenderdatum des Basiszeitpunkts in Berliner Ortszeit bestimmen.
  const berlinDatum = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(basis); // liefert "YYYY-MM-DD"
  const [y, m, d] = berlinDatum.split("-").map(Number);

  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + tage);

  const wochentag = dt.getUTCDay(); // 0 = Sonntag ... 6 = Samstag
  if (wochentag === 6) dt.setUTCDate(dt.getUTCDate() + 2); // Samstag -> Montag
  else if (wochentag === 0) dt.setUTCDate(dt.getUTCDate() + 1); // Sonntag -> Montag

  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Legt – falls noch nicht geschehen – fuer eine kontaktierte Firma den
// Wiedervorlage-Termin im primaeren Kalender des handelnden Nutzers an und
// vermerkt ihn am Datensatz. Bewusst tolerant: ohne verbundenes Google-Konto
// oder bei Kalenderfehlern passiert nichts (kein Vermerk), damit ein spaeterer
// Anlauf es erneut versuchen kann und der Akquise-Ablauf nie abbricht.
export async function ensureWiedervorlage(
  prepId: string,
  userId: string,
  basis: Date = new Date()
): Promise<void> {
  const prep = await prisma.contactPrep.findUnique({
    where: { id: prepId },
    select: {
      id: true,
      status: true,
      firma: true,
      telefon: true,
      email: true,
      kanal: true,
      notiz: true,
      wiedervorlage: true,
    },
  });
  if (!prep) return;
  if (prep.status !== "kontaktiert") return; // nur fuer kontaktierte Firmen
  if (prep.wiedervorlage) return; // schon angelegt -> keine Dublette

  const client = await getGoogleClientForUser(userId);
  if (!client) return; // kein Kalender verbunden -> spaeter erneut versuchen

  const datum = wiedervorlageDatum(basis); // Wiedervorlage-Tag "YYYY-MM-DD"

  const aktion = prep.kanal === "mail" ? "nochmal schreiben" : "nochmal anrufen";
  const beschreibung = [
    prep.telefon ? `Telefon: ${prep.telefon}` : "",
    prep.email ? `E-Mail: ${prep.email}` : "",
    prep.notiz ? `Notiz: ${prep.notiz}` : "",
    "— automatische Wiedervorlage aus dem Lumio-Dashboard",
  ]
    .filter(Boolean)
    .join("\n");

  // Ganztagestermin am Wiedervorlage-Tag (keine feste Uhrzeit). Google erwartet
  // ein exklusives Ende, daher der Folgetag.
  const eventId = await createCalendarEvent(client, {
    title: `Wiedervorlage: ${prep.firma} – ${aktion}`,
    start: datum,
    end: naechsterTag(datum),
    description: beschreibung,
    allDay: true,
  });

  await prisma.contactPrep.update({
    where: { id: prep.id },
    // Datum als Tagesmarke (UTC-Mitternacht) – dient hier v. a. dem Dubletten-Schutz.
    data: { wiedervorlage: new Date(`${datum}T00:00:00Z`), wiedervorlageEventId: eventId },
  });
}

// Best-effort: den Wiedervorlage-Termin einer Firma wieder aus dem Kalender
// entfernen (z. B. wenn die Vorbereitung geloescht wird). Schlaegt der Zugriff
// fehl (fremder Kalender, Termin schon weg), wird still ignoriert.
export async function entferneWiedervorlage(eventId: string, userId: string): Promise<void> {
  try {
    const client = await getGoogleClientForUser(userId);
    if (!client) return;
    await deleteCalendarEvent(client, eventId);
  } catch {
    /* nicht fatal – Termin bleibt ggf. stehen */
  }
}
