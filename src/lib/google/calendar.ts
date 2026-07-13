// Google-Kalender-Funktionen (Termine lesen/erstellen). Nur serverseitig.
import { google } from "googleapis";
import type { CalEvent } from "@/lib/types";

// Client-Typ direkt aus googleapis ableiten (verhindert Typkonflikte)
type OAuthClient = InstanceType<typeof google.auth.OAuth2>;

// Kommende Termine laden und in unser einfaches Format bringen
export async function listUpcomingEvents(
  client: OAuthClient,
  maxResults = 25
): Promise<CalEvent[]> {
  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map((e) => {
    // Ganztagestermine haben nur ein "date", Uhrzeit-Termine ein "dateTime"
    const allDay = Boolean(e.start?.date);
    const start = e.start?.dateTime ?? e.start?.date ?? new Date().toISOString();
    const end = e.end?.dateTime ?? e.end?.date ?? start;
    return {
      id: e.id ?? Math.random().toString(36),
      title: e.summary ?? "(ohne Titel)",
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay,
      location: e.location ?? undefined,
    };
  });
}

// Einen neuen Termin anlegen. Gibt die Event-ID des angelegten Termins zurueck
// (oder null), damit Aufrufer den Termin spaeter gezielt bearbeiten/loeschen koennen.
// Bei allDay werden start/end als Datum "YYYY-MM-DD" erwartet (Ganztagestermin,
// end ist – wie von Google verlangt – exklusiv, also der Folgetag).
export async function createCalendarEvent(
  client: OAuthClient,
  input: {
    title: string;
    start: string;
    end: string;
    location?: string;
    description?: string;
    allDay?: boolean;
  }
): Promise<string | null> {
  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: input.allDay
        ? { date: input.start }
        : { dateTime: new Date(input.start).toISOString() },
      end: input.allDay
        ? { date: input.end }
        : { dateTime: new Date(input.end).toISOString() },
    },
  });
  return res.data.id ?? null;
}

// Einen bestehenden Termin bearbeiten
export async function updateCalendarEvent(
  client: OAuthClient,
  eventId: string,
  input: { title: string; start: string; end: string; location?: string; description?: string }
) {
  const cal = google.calendar({ version: "v3", auth: client });
  await cal.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: { dateTime: new Date(input.start).toISOString() },
      end: { dateTime: new Date(input.end).toISOString() },
    },
  });
}

// Einen Termin loeschen
export async function deleteCalendarEvent(client: OAuthClient, eventId: string) {
  const cal = google.calendar({ version: "v3", auth: client });
  await cal.events.delete({ calendarId: "primary", eventId });
}
