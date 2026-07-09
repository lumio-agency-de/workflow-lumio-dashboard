// Anfragen-Seite: automatische Lead-Pipeline aus E-Mail-Anfragen.
import { prisma } from "@/lib/prisma";
import { getMailView, getCalendarView } from "@/lib/dashboard-data";
import { computeCapacity } from "@/lib/capacity";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import GoogleConnectBanner from "@/components/google-connect-banner";
import LeadCard, { type LeadCardData } from "./lead-card";

export const dynamic = "force-dynamic";

// Reihenfolge und Ueberschriften der Abschnitte
const SECTIONS: { statuses: string[]; title: string }[] = [
  { statuses: ["neu"], title: "Neue Anfragen" },
  { statuses: ["angebot_erstellt"], title: "In Bearbeitung" },
  { statuses: ["angebot_gesendet"], title: "Angebot gesendet" },
  { statuses: ["gewonnen", "verloren"], title: "Abgeschlossen" },
];

export default async function AnfragenPage() {
  // Mails laden (legt neue Anfragen automatisch an) + Kalender + offene Auftraege
  const [mailView, calView, openOrders] = await Promise.all([
    getMailView(),
    getCalendarView(),
    prisma.order.count({ where: { status: { not: "erledigt" } } }),
  ]);

  // Kapazitaets-Ampel aus Kalender + Auftraegen berechnen
  const capacity = computeCapacity(calView.data, openOrders);

  // Alle Anfragen inkl. verknuepftem Angebot laden
  const leads = await prisma.lead.findMany({
    include: { offer: { include: { items: { orderBy: { position: "asc" } } } } },
    orderBy: { mailDate: "desc" },
  });

  // Wiedervorlage: Angebot vor mehr als 7 Tagen gesendet, noch keine Entscheidung
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Daten fuer die Karten aufbereiten (nur einfache Werte)
  const cards: LeadCardData[] = leads.map((l) => ({
    id: l.id,
    fromName: l.fromName,
    fromEmail: l.fromEmail,
    subject: l.subject,
    snippet: l.snippet,
    mailDate: l.mailDate.toISOString(),
    status: l.status,
    emailDraft: l.emailDraft,
    sentAt: l.sentAt ? l.sentAt.toISOString() : null,
    needsFollowUp:
      l.status === "angebot_gesendet" && !!l.sentAt && l.sentAt < sevenDaysAgo,
    offer: l.offer
      ? {
          id: l.offer.id,
          number: l.offer.number,
          total: l.offer.total,
          validUntil: l.offer.validUntil.toISOString(),
          items: l.offer.items.map((i) => ({
            position: i.position,
            label: i.label,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        }
      : null,
  }));

  const offen = cards.filter((c) =>
    ["neu", "angebot_erstellt", "angebot_gesendet"].includes(c.status)
  ).length;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Anfragen"
          subtitle={`${offen} in der Pipeline · Anfragen aus E-Mails werden automatisch erkannt`}
        />
      </Reveal>

      <Reveal delay={0.05}>
        <GoogleConnectBanner
          configured={mailView.configured}
          connected={mailView.connected}
          selfConnected={mailView.selfConnected}
          demo={mailView.demo}
          accounts={mailView.accounts}
        />
      </Reveal>

      {cards.length === 0 && (
        <Reveal delay={0.1}>
          <div className="glass rounded-2xl p-10 text-center text-muted">
            Noch keine Anfragen. Sobald eine E-Mail als „Anfrage“ erkannt wird,
            erscheint sie hier automatisch.
          </div>
        </Reveal>
      )}

      {/* Abschnitte nach Status */}
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section, si) => {
          const items = cards.filter((c) => section.statuses.includes(c.status));
          if (items.length === 0) return null;
          return (
            <Reveal key={section.title} delay={0.1 + si * 0.05}>
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                  {section.title}
                  <span className="rounded-full border border-line bg-white/5 px-2 text-xs text-muted">
                    {items.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-4">
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      capacity={capacity}
                      googleConnected={mailView.connected}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
