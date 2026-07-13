// Zentrale Datenschicht fuer Kalender und E-Mails.
// Kalender: alle verbundenen Konten gemeinsam (fuers Planen).
// Mails: nur das eigene Postfach + das gemeinsame info@-Postfach (nicht die
// Mails der anderen Kollegen), aus Datenschutzgruenden.
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { googleConfigured } from "@/lib/env";
import { getGoogleClientForAccount } from "@/lib/google/client";
import { listUpcomingEvents } from "@/lib/google/calendar";
import { listRecentMessages, listSentMessages } from "@/lib/google/gmail";
import { syncLeadsFromMails } from "@/lib/leads";
import type { CalEvent, MailItem, SentMailItem, DataView } from "@/lib/types";

// Google-Abrufe sind der langsamste Teil jeder Seite. Kurze Zwischenspeicherung
// (pro Konto) sorgt dafuer, dass schnelles Wechseln zwischen Seiten nicht jedes
// Mal erneut bei Google anfragt. Nach Aenderungen (Termin anlegen/bearbeiten/
// loeschen) wird der jeweilige Eintrag sofort per revalidateTag geleert.
const CACHE_SECONDS = 20;

// Zwischenspeicherung erfolgt jetzt PRO KONTO (GoogleAccount.id), da ein Nutzer
// mehrere Konten haben kann. Die Cache-Tags heissen entsprechend
// `calendar-<accountId>` bzw. `mail-<accountId>` (siehe kalender/actions.ts).
async function fetchEventsCached(accountId: string) {
  return unstable_cache(
    async () => {
      const client = await getGoogleClientForAccount(accountId);
      if (!client) return [] as CalEvent[];
      return listUpcomingEvents(client, 30);
    },
    ["calendar-events", accountId],
    { revalidate: CACHE_SECONDS, tags: [`calendar-${accountId}`] }
  )();
}

async function fetchMailsCached(accountId: string) {
  return unstable_cache(
    async () => {
      const client = await getGoogleClientForAccount(accountId);
      if (!client) return [] as MailItem[];
      return listRecentMessages(client, 20);
    },
    ["gmail-messages", accountId],
    { revalidate: CACHE_SECONDS, tags: [`mail-${accountId}`] }
  )();
}

async function fetchSentMailsCached(accountId: string) {
  return unstable_cache(
    async () => {
      const client = await getGoogleClientForAccount(accountId);
      if (!client) return [] as SentMailItem[];
      return listSentMessages(client, 20);
    },
    ["gmail-sent", accountId],
    // Beim Versenden wird `mail-<accountId>` geleert – denselben Tag nutzen,
    // damit eine gerade gesendete Mail sofort im Postausgang auftaucht.
    { revalidate: CACHE_SECONDS, tags: [`mail-${accountId}`] }
  )();
}

// Ein einzelnes verbundenes Google-Konto, angereichert um den Besitzer-Nutzer
// (fuer Einfaerbung + Anzeige). Ein Nutzer kann mehrere solcher Konten haben.
type AccountRow = {
  accountId: string;
  userId: string;
  username: string;
  name: string;
  email: string;
};

// Alle Dashboard-Nutzer inkl. ihrer (0..n) verbundenen Google-Konten.
// Mit "cache" zwischengespeichert, da Kalender- und Mail-Abfrage das auf
// derselben Seite (z. B. Startseite) sonst doppelt abfragen wuerden.
const teamData = cache(async function teamData() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      googleAccounts: {
        select: { id: true, email: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { username: "asc" },
  });

  // Team-Uebersicht PRO PERSON (fuer Banner/Filter): verbunden = >=1 Konto.
  const members = users.map((u) => ({
    userId: u.id,
    username: u.username,
    name: u.name,
    connected: u.googleAccounts.length > 0,
  }));

  // Flache Liste ALLER verbundenen Konten (fuer die eigentlichen Abrufe).
  const accountRows: AccountRow[] = users.flatMap((u) =>
    u.googleAccounts.map((a) => ({
      accountId: a.id,
      userId: u.id,
      username: u.username,
      name: u.name,
      email: a.email,
    }))
  );

  return { members, accountRows };
});

// Kalender-Ansicht: Termine aus ALLEN verbundenen Konten zusammengefuehrt.
// Einfaerbung bleibt pro Person; hat eine Person mehrere Konten, fliessen die
// Termine all ihrer Konten ein (gleiche Farbe).
export async function getCalendarView(): Promise<DataView<CalEvent[]>> {
  const { members, accountRows } = await teamData();
  const session = await auth();
  const ownUsername = session?.user?.username;
  const selfConnected = members.some((m) => m.username === ownUsername && m.connected);
  const accounts = members;

  if (!googleConfigured) {
    return { configured: false, connected: false, selfConnected, demo: true, data: [], accounts };
  }
  if (accountRows.length === 0) {
    return { configured: true, connected: false, selfConnected, demo: true, data: [], accounts };
  }

  const perAccount = await Promise.all(
    accountRows.map(async (acc) => {
      try {
        const events = await fetchEventsCached(acc.accountId);
        return events.map((e) => ({
          ...e,
          ownerUserId: acc.userId,
          ownerUsername: acc.username,
          ownerName: acc.name,
          ownerAccountId: acc.accountId,
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

  return { configured: true, connected: true, selfConnected, demo: false, data, accounts };
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
  const { members, accountRows } = await teamData();

  // Sichtbarer Ausschnitt: das EIGENE Postfach = ALLE Konten des eingeloggten
  // Nutzers, plus das gemeinsame info@-Postfach (alle dortigen Konten).
  const session = await auth();
  const ownUsername = session?.user?.username;
  const selfConnected = members.some((m) => m.username === ownUsername && m.connected);

  // Team-Uebersicht fuers Filter-UI (pro Person): eigene Person + info.
  const accounts = members.filter(
    (m) => m.username === ownUsername || m.username === "info"
  );

  // Die tatsaechlich abzurufenden Konten (pro Konto): alle Konten der eigenen
  // Person + alle Konten des info-Nutzers.
  const visibleAccounts = accountRows.filter(
    (a) => a.username === ownUsername || a.username === "info"
  );

  if (!googleConfigured) {
    return { configured: false, connected: false, selfConnected, demo: true, data: [], accounts };
  }
  if (visibleAccounts.length === 0) {
    return { configured: true, connected: false, selfConnected, demo: true, data: [], accounts };
  }

  const perAccount = await Promise.all(
    visibleAccounts.map(async (acc) => {
      try {
        const mails = await fetchMailsCached(acc.accountId);
        return mails.map((m) => ({
          ...m,
          ownerUserId: acc.userId,
          ownerUsername: acc.username,
          ownerName: acc.name,
          ownerEmail: acc.email,
          ownerAccountId: acc.accountId,
        }));
      } catch {
        return [];
      }
    })
  );

  const data = perAccount
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { configured: true, connected: true, selfConnected, demo: false, data, accounts };
}

// Postausgang-Ansicht: gesendete Mails der sichtbaren Konten (eigenes Postfach +
// info@) zusammengefuehrt, mit Volltext. Gleicher Sichtbarkeits-Ausschnitt wie
// der Posteingang.
export async function getSentMailView(): Promise<DataView<SentMailItem[]>> {
  const { members, accountRows } = await teamData();

  const session = await auth();
  const ownUsername = session?.user?.username;
  const selfConnected = members.some((m) => m.username === ownUsername && m.connected);

  const accounts = members.filter(
    (m) => m.username === ownUsername || m.username === "info"
  );
  const visibleAccounts = accountRows.filter(
    (a) => a.username === ownUsername || a.username === "info"
  );

  if (!googleConfigured) {
    return { configured: false, connected: false, selfConnected, demo: true, data: [], accounts };
  }
  if (visibleAccounts.length === 0) {
    return { configured: true, connected: false, selfConnected, demo: true, data: [], accounts };
  }

  const perAccount = await Promise.all(
    visibleAccounts.map(async (acc) => {
      try {
        const mails = await fetchSentMailsCached(acc.accountId);
        return mails.map((m) => ({
          ...m,
          ownerUserId: acc.userId,
          ownerUsername: acc.username,
          ownerName: acc.name,
          ownerEmail: acc.email,
          ownerAccountId: acc.accountId,
        }));
      } catch {
        return [];
      }
    })
  );

  const data = perAccount
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { configured: true, connected: true, selfConnected, demo: false, data, accounts };
}
