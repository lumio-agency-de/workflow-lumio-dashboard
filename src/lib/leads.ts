// Anfragen-Verwaltung: legt aus E-Mails der Kategorie "Anfrage" automatisch
// Lead-Eintraege in der Datenbank an (ohne Duplikate, dank eindeutiger Mail-ID).
import { prisma } from "@/lib/prisma";
import type { MailItem } from "@/lib/types";

export async function syncLeadsFromMails(mails: MailItem[]): Promise<void> {
  const anfragen = mails.filter((m) => m.category === "Anfrage");
  for (const m of anfragen) {
    try {
      // upsert = anlegen, falls diese Mail noch keinen Lead hat; sonst nichts tun
      await prisma.lead.upsert({
        where: { mailId: m.id },
        update: {},
        create: {
          mailId: m.id,
          fromName: m.fromName,
          fromEmail: m.fromEmail,
          subject: m.subject,
          snippet: m.snippet,
          mailDate: new Date(m.date),
        },
      });
    } catch {
      // Einzelne Fehler ignorieren (z. B. Wettlauf bei parallelem Laden)
    }
  }
}

// Anzahl neuer Anfragen + faellige Wiedervorlagen (fuer Hinweise auf der Uebersicht)
export async function getLeadSignals() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [neu, wiedervorlage] = await Promise.all([
    prisma.lead.count({ where: { status: "neu" } }),
    prisma.lead.count({
      where: { status: "angebot_gesendet", sentAt: { lt: sevenDaysAgo } },
    }),
  ]);
  return { neu, wiedervorlage };
}
