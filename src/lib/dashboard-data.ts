// Zentrale Datenschicht fuer Kalender und E-Mails.
// Kalender: alle verbundenen Konten gemeinsam (fuers Planen).
// Mails: nur das eigene Postfach + das gemeinsame info@-Postfach (nicht die
// Mails der anderen Kollegen), aus Datenschutzgruenden.
import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { googleConfigured } from "@/lib/env";
import { getGoogleClientForUser } from "@/lib/google/client";
import { listUpcomingEvents } from "@/lib/google/calendar";
import { listRecentMessages } from "@/lib/google/gmail";
import { syncLeadsFromMails } from "@/lib/leads";
import type { CalEvent, MailItem, DataView } from "@/lib/types";

// Alle Dashboard-Nutzer, jeweils mit Info ob + welches Google-Konto verbunden ist.
// Mit "cache" zwischengespeichert, da Kalender- und Mail-Abfrage das auf
// derselben Seite (z. B. Startseite) sonst doppelt abfragen wuerden.
const teamAccounts = cache(async function teamAccounts() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      googleAccount: { select: { email: true } },
    },
    orderBy: { username: "asc" },
  });
  return users.map((u) => ({
    userId: u.id,
    username: u.username,
    name: u.name,
    email: u.googleAccount?.email ?? "",
    connected: Boolean(u.googleAccount),
  }));
});

// Kalender-Ansicht: Termine aus allen verbundenen Konten zusammengefuehrt
export async function getCalendarView(): Promise<DataView<CalEvent[]>> {
  const team = await teamAccounts();
  const accounts = team.map((t) => ({
    userId: t.userId,
    username: t.username,
    name: t.name,
    connected: t.connected,
  }));

  if (!googleConfigured) {
    return { configured: false, connected: false, demo: true, data: [], accounts };
  }
  const connectedMembers = team.filter((t) => t.connected);
  if (connectedMembers.length === 0) {
    return { configured: true, connected: false, demo: true, data: [], accounts };
  }

  const perAccount = await Promise.all(
    connectedMembers.map(async (member) => {
      try {
        const client = await getGoogleClientForUser(member.userId);
        if (!client) return [];
        const events = await listUpcomingEvents(client, 30);
        return events.map((e) => ({
          ...e,
          ownerUserId: member.userId,
          ownerUsername: member.username,
          ownerName: member.name,
        }));
      } catch {
        // Einzelnes Konto mit Problem (z. B. Token abgelaufen) ignorieren,
        // die anderen Konten trotzdem anzeigen
        return [];
      }
    })
  );

  const data = perAccount
    .flat()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return { configured: true, connected: true, demo: false, data, accounts };
}

// E-Mail-Ansicht: Posteingaenge aller verbundenen Konten zusammengefuehrt.
// Nebeneffekt: E-Mails der Kategorie "Anfrage" werden automatisch als
// Anfragen (Leads) in der Datenbank hinterlegt (mit Herkunfts-Postfach).
export async function getMailView(): Promise<DataView<MailItem[]>> {
  const view = await loadMails();
  await syncLeadsFromMails(view.data); // Anfragen automatisch anlegen (ohne Duplikate)
  return view;
}

async function loadMails(): Promise<DataView<MailItem[]>> {
  const team = await teamAccounts();

  // Sichtbarer Ausschnitt: nur das eigene Konto + das gemeinsame info@-Konto
  const session = await auth();
  const ownUsername = session?.user?.username;
  const visibleTeam = team.filter(
    (t) => t.username === ownUsername || t.username === "info"
  );
  const accounts = visibleTeam.map((t) => ({
    userId: t.userId,
    username: t.username,
    name: t.name,
    connected: t.connected,
  }));

  if (!googleConfigured) {
    return { configured: false, connected: false, demo: true, data: [], accounts };
  }
  const connectedMembers = visibleTeam.filter((t) => t.connected);
  if (connectedMembers.length === 0) {
    return { configured: true, connected: false, demo: true, data: [], accounts };
  }

  const perAccount = await Promise.all(
    connectedMembers.map(async (member) => {
      try {
        const client = await getGoogleClientForUser(member.userId);
        if (!client) return [];
        const mails = await listRecentMessages(client, 20);
        return mails.map((m) => ({
          ...m,
          ownerUserId: member.userId,
          ownerUsername: member.username,
          ownerName: member.name,
          ownerEmail: member.email,
        }));
      } catch {
        return [];
      }
    })
  );

  const data = perAccount
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { configured: true, connected: true, demo: false, data, accounts };
}
