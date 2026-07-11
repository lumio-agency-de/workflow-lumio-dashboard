// Auswertung / Reporting: alle wichtigen Zahlen auf einen Blick.
// Bewusst rein anzeigend – die Rechenlogik liegt in src/lib/auswertung.ts,
// die Diagramme in ./charts.tsx.
//
// ALLE Datenbank-Abfragen sind crash-sicher (.catch): die Akquise-Tabellen
// (Prospect) sind evtl. noch nicht migriert; faellt eine Abfrage aus, zeigt die
// Seite an dieser Stelle einfach 0 statt einen 500er zu werfen.
import {
  Euro,
  TrendingUp,
  Percent,
  Briefcase,
  FileText,
  Target,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCalendarView } from "@/lib/dashboard-data";
import { computeCapacity } from "@/lib/capacity";
import {
  computeUmsatz,
  computePipeline,
  computeConversion,
  computeFunnel,
} from "@/lib/auswertung";
import { formatEuro, formatDayShort, formatTime } from "@/lib/format";
import { Panel, PageHeader, StatCard } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { CapacityBadge } from "@/components/badges";
import { UmsatzBalken, ConversionRing, FunnelBalken } from "./charts";

export const dynamic = "force-dynamic";

// Zeitraum fuer den Umsatz-Verlauf (Monate).
const MONATE = 6;

export default async function AuswertungPage() {
  // Kern-Tabellen (Order/Offer) sind stabil, werden aber – wie vom Projekt
  // vorgegeben – trotzdem abgesichert. Prospect kann fehlen.
  const [orders, offers, prospectGroups, calView] = await Promise.all([
    prisma.order.findMany().catch(() => []),
    prisma.offer.findMany().catch(() => []),
    prisma.prospect
      .groupBy({ by: ["status"], _count: { _all: true } })
      .catch(() => [] as { status: string; _count: { _all: number } }[]),
    getCalendarView().catch(() => null),
  ]);

  // Kennzahlen berechnen
  const umsatz = computeUmsatz(orders, offers, MONATE);
  const pipeline = computePipeline(offers);
  const conversion = computeConversion(offers);

  const prospectCounts: Record<string, number> = {};
  for (const g of prospectGroups) prospectCounts[g.status] = g._count._all;
  const funnel = computeFunnel(prospectCounts);
  const prospectGesamt = Object.values(prospectCounts).reduce((s, n) => s + n, 0);

  // Auslastung: offene Auftraege + Termindichte der kommenden Tage
  const offeneAuftraege = orders.filter((o) => o.status !== "erledigt");
  const events = calView?.data ?? [];
  const capacity = computeCapacity(events, offeneAuftraege.length);

  // Kommende Termine (die naechsten, bereits nach Startzeit sortiert).
  // Server-Component: der Zeitpunkt wird pro Request einmal ausgewertet und ist
  // damit stabil fuer diesen Render -> die Purity-Regel ist hier ein Fehlalarm.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const kommendeTermine = events
    .filter((e) => new Date(e.start).getTime() >= now)
    .slice(0, 5);

  // Auftraege nach Status (fuer die kleine Aufschluesselung)
  const statusLabels: { key: string; label: string }[] = [
    { key: "offen", label: "Offen" },
    { key: "in_arbeit", label: "In Arbeit" },
    { key: "wartet", label: "Wartet" },
    { key: "erledigt", label: "Erledigt" },
  ];
  const ordersByStatus = statusLabels.map((s) => ({
    ...s,
    anzahl: orders.filter((o) => o.status === s.key).length,
  }));

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Auswertung"
          subtitle={`Kennzahlen im Überblick · Umsatz-Verlauf über ${MONATE} Monate`}
        />
      </Reveal>

      {/* Kennzahlen-Zeile */}
      <Reveal delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Umsatz (Proxy)"
            value={formatEuro(umsatz.gesamt)}
            icon={Euro}
            hint={`letzte ${MONATE} Monate`}
          />
          <StatCard
            label="Pipeline-Wert"
            value={formatEuro(pipeline.wert)}
            icon={TrendingUp}
            hint={`${pipeline.anzahl} offene Angebote`}
          />
          <StatCard
            label="Conversion"
            value={`${conversion.quote}%`}
            icon={Percent}
            hint={`${conversion.angenommen} von ${
              conversion.angenommen + conversion.abgelehnt
            } entschieden`}
          />
          <StatCard
            label="Offene Aufträge"
            value={offeneAuftraege.length}
            icon={Briefcase}
            hint={capacity.label}
          />
        </div>
      </Reveal>

      {/* Umsatz-Verlauf */}
      <Reveal delay={0.1}>
        <Panel className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Euro className="h-[18px] w-[18px] text-accent" />
              Umsatz je Monat
            </h2>
            <span className="text-sm text-muted">
              Gesamt {formatEuro(umsatz.gesamt)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Proxy ohne Rechnungsmodul: angenommene Angebote (
            {formatEuro(umsatz.gesamtAngenommen)}) + erledigte Aufträge (
            {formatEuro(umsatz.gesamtAuftraege)}).
          </p>
          <div className="mt-5">
            <UmsatzBalken monate={umsatz.monate} max={umsatz.maxMonat} />
          </div>
        </Panel>
      </Reveal>

      {/* Conversion + Pipeline nebeneinander */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Reveal delay={0.15}>
          <Panel className="p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Percent className="h-[18px] w-[18px] text-accent" />
              Conversion
            </h2>
            <p className="mt-1 mb-5 text-xs text-muted">
              Angenommene Angebote im Verhältnis zu allen entschiedenen.
            </p>
            <ConversionRing
              quote={conversion.quote}
              angenommen={conversion.angenommen}
              abgelehnt={conversion.abgelehnt}
            />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
              <MiniZahl label="Gesamt" value={conversion.gesamt} icon={FileText} />
              <MiniZahl label="Offen" value={conversion.offen} icon={TrendingUp} />
              <MiniZahl
                label="Angenommen"
                value={conversion.angenommen}
                icon={Percent}
              />
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={0.2}>
          <Panel className="p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Target className="h-[18px] w-[18px] text-accent" />
              Akquise-Funnel
            </h2>
            <p className="mt-1 mb-5 text-xs text-muted">
              {prospectGesamt} Kontakte in der Pipeline (neu → erledigt).
            </p>
            <FunnelBalken stufen={funnel.stufen} max={funnel.max} />
          </Panel>
        </Reveal>
      </div>

      {/* Auslastung */}
      <Reveal delay={0.25}>
        <Panel className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CalendarClock className="h-[18px] w-[18px] text-accent" />
              Auslastung
            </h2>
            <CapacityBadge level={capacity.level} label={capacity.label} />
          </div>
          <p className="mt-1 text-xs text-muted">{capacity.hint}</p>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {/* Kommende Termine */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted">
                Kommende Termine
              </h3>
              <ul className="flex flex-col gap-3">
                {kommendeTermine.map((e) => (
                  <li key={e.id} className="flex items-center gap-3">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-line bg-white/5 py-1">
                      <span className="text-[10px] uppercase text-muted">
                        {formatDayShort(e.start).split(",")[0]}
                      </span>
                      <span className="text-sm font-semibold">
                        {e.allDay ? "ganzt." : formatTime(e.start)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      {e.location && (
                        <div className="flex items-center gap-1 truncate text-xs text-muted">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {kommendeTermine.length === 0 && (
                  <li className="text-sm text-muted">
                    {calView
                      ? "Keine anstehenden Termine."
                      : "Kalender nicht verbunden."}
                  </li>
                )}
              </ul>
            </div>

            {/* Auftraege nach Status */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted">
                Aufträge nach Status
              </h3>
              <ul className="flex flex-col gap-2.5">
                {ordersByStatus.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted">{s.label}</span>
                    <span className="font-semibold tabular-nums">{s.anzahl}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between border-t border-line pt-2.5 text-sm">
                  <span className="font-medium">Gesamt</span>
                  <span className="font-semibold tabular-nums">
                    {orders.length}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

// Kleine beschriftete Zahl (unter dem Conversion-Ring)
function MiniZahl({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
}) {
  return (
    <div>
      <Icon className="mx-auto h-4 w-4 text-muted" />
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
