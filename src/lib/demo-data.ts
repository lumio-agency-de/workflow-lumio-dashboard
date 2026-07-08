// Beispiel-Daten fuer Kalender und E-Mails.
// Werden angezeigt, solange kein Google-Konto verbunden ist – damit man das
// Dashboard sofort in Aktion sieht.
import type { CalEvent, MailItem, MailCategory } from "@/lib/types";

// Hilfsfunktion: Datum relativ zu heute erzeugen
function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// E-Mail anhand von Betreff/Absender grob einer Kategorie zuordnen (regelbasiert)
export function categorizeEmail(subject: string, from: string): MailCategory {
  const s = `${subject} ${from}`.toLowerCase();
  if (/(rechnung|invoice|zahlung|mahnung|beleg)/.test(s)) return "Rechnung";
  if (/(anfrage|angebot|projekt|interesse|website|homepage)/.test(s))
    return "Anfrage";
  if (/(support|problem|fehler|hilfe|funktioniert nicht|störung)/.test(s))
    return "Support";
  if (/(newsletter|angebote|rabatt|% |sale|update abonn)/.test(s))
    return "Newsletter";
  return "Sonstiges";
}

// Beispiel-Termine (immer relativ zu heute)
export function demoEvents(): CalEvent[] {
  const mk = (
    id: string,
    title: string,
    startD: Date,
    durationMin: number,
    location?: string
  ): CalEvent => ({
    id,
    title,
    start: startD.toISOString(),
    end: new Date(startD.getTime() + durationMin * 60000).toISOString(),
    allDay: false,
    location,
  });

  return [
    mk("d1", "Kick-off Bäckerei Müller", at(0, 10), 60, "Videocall"),
    mk("d2", "Website-Feedback Kanzlei Weber", at(0, 14, 30), 45, "Telefon"),
    mk("d3", "Fotoshooting Kunde vor Ort", at(1, 9), 120, "Köln"),
    mk("d4", "Angebot durchsprechen – Fitnessstudio", at(2, 11), 30),
    mk("d5", "Team-Planung Woche", at(3, 9), 45, "Büro"),
    mk("d6", "Launch Landingpage Zahnarztpraxis", at(5, 16), 60),
  ];
}

// Beispiel-E-Mails
export function demoMails(): MailItem[] {
  const raw: Omit<MailItem, "category">[] = [
    {
      id: "m1",
      fromName: "Sandra Müller",
      fromEmail: "s.mueller@baeckerei-mueller.de",
      subject: "Anfrage neue Website mit Online-Terminen",
      snippet:
        "Hallo Lumio-Team, wir würden gerne unsere Website erneuern und ein Terminbuchungssystem …",
      date: at(0, 8, 12).toISOString(),
      unread: true,
    },
    {
      id: "m2",
      fromName: "Hosting Provider",
      fromEmail: "billing@hosting.example",
      subject: "Ihre Rechnung Nr. 2026-4471",
      snippet: "Anbei erhalten Sie Ihre monatliche Rechnung für das Hosting-Paket …",
      date: at(-1, 6, 30).toISOString(),
      unread: true,
    },
    {
      id: "m3",
      fromName: "Thomas Weber",
      fromEmail: "kanzlei@weber-recht.de",
      subject: "Problem: Kontaktformular funktioniert nicht",
      snippet: "Guten Tag, seit heute Morgen kommen keine Nachrichten mehr über das Formular an …",
      date: at(-1, 9, 5).toISOString(),
      unread: false,
    },
    {
      id: "m4",
      fromName: "Design Weekly",
      fromEmail: "news@designweekly.example",
      subject: "Newsletter: 10 UI-Trends 2026",
      snippet: "Die wichtigsten Design-Trends dieser Woche im Überblick …",
      date: at(-2, 12, 0).toISOString(),
      unread: false,
    },
    {
      id: "m5",
      fromName: "Fitnessstudio Aktiv",
      fromEmail: "info@aktiv-fitness.de",
      subject: "Interesse an Website-Relaunch + Shop",
      snippet: "Hallo, wir hätten Interesse an einem neuen Auftritt inklusive kleinem Shop …",
      date: at(-2, 15, 40).toISOString(),
      unread: true,
    },
  ];

  return raw.map((m) => ({
    ...m,
    category: categorizeEmail(m.subject, m.fromEmail),
  }));
}
