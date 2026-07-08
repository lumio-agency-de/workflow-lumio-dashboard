// Zentrale Datenschicht fuer Kalender und E-Mails.
// Liefert echte Google-Daten, wenn alles eingerichtet und verbunden ist –
// sonst Beispiel-Daten (damit das Dashboard immer etwas anzeigt).
import { auth } from "@/auth";
import { googleConfigured } from "@/lib/env";
import { getGoogleClientForUser } from "@/lib/google/client";
import { listUpcomingEvents } from "@/lib/google/calendar";
import { listRecentMessages } from "@/lib/google/gmail";
import { demoEvents, demoMails } from "@/lib/demo-data";
import { syncLeadsFromMails } from "@/lib/leads";
import type { CalEvent, MailItem, DataView } from "@/lib/types";

// ID des aktuell eingeloggten Nutzers
async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Kalender-Ansicht (live oder Demo)
export async function getCalendarView(): Promise<DataView<CalEvent[]>> {
  if (!googleConfigured) {
    return { configured: false, connected: false, demo: true, data: demoEvents() };
  }
  const userId = await currentUserId();
  const client = userId ? await getGoogleClientForUser(userId) : null;
  if (!client) {
    return { configured: true, connected: false, demo: true, data: demoEvents() };
  }
  try {
    const data = await listUpcomingEvents(client, 30);
    return { configured: true, connected: true, demo: false, data };
  } catch {
    // Bei Fehlern (z. B. Token abgelaufen) Demo-Daten statt Absturz
    return { configured: true, connected: false, demo: true, data: demoEvents() };
  }
}

// E-Mail-Ansicht (live oder Demo).
// Nebeneffekt: E-Mails der Kategorie "Anfrage" werden automatisch als
// Anfragen (Leads) in der Datenbank hinterlegt.
export async function getMailView(): Promise<DataView<MailItem[]>> {
  const view = await loadMails();
  await syncLeadsFromMails(view.data); // Anfragen automatisch anlegen (ohne Duplikate)
  return view;
}

async function loadMails(): Promise<DataView<MailItem[]>> {
  if (!googleConfigured) {
    return { configured: false, connected: false, demo: true, data: demoMails() };
  }
  const userId = await currentUserId();
  const client = userId ? await getGoogleClientForUser(userId) : null;
  if (!client) {
    return { configured: true, connected: false, demo: true, data: demoMails() };
  }
  try {
    const data = await listRecentMessages(client, 20);
    return { configured: true, connected: true, demo: false, data };
  } catch {
    return { configured: true, connected: false, demo: true, data: demoMails() };
  }
}
