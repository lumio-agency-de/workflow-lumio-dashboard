// Start-Dashboard (Uebersicht) mit Kennzahlen und Widgets.
import Link from "next/link";
import {
  Calendar,
  Mail,
  Briefcase,
  FileText,
  Plus,
  ArrowRight,
  MapPin,
  ListChecks,
  Target,
  Flame,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarView, getMailView } from "@/lib/dashboard-data";
import { getLeadSignals } from "@/lib/leads";
import { formatEuro, formatTime, formatDayShort, isToday } from "@/lib/format";
import { Panel, PageHeader, StatCard } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { CategoryBadge, OrderStatusBadge } from "@/components/badges";
import TodoItem from "./todos/todo-item";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const session = await auth();

  // Alle Daten parallel laden
  const [orders, offers, todos, calView, mailView] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "erledigt" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offer.findMany(),
    prisma.todo.findMany({
      where: { done: false },
      orderBy: { createdAt: "desc" },
    }),
    getCalendarView(),
    getMailView(),
  ]);

  // Anfragen-Signale NACH dem Mail-Laden abfragen (dabei entstehen neue Leads)
  const leadSignals = await getLeadSignals();

  // Akquise-Kennzahlen parallel laden. Die Akquise-Tabellen sind evtl. noch
  // nicht migriert, daher jede Abfrage einzeln absichern (Fehler -> 0).
  const [offeneLeads, heisseLeads, inVorbereitung] = await Promise.all([
    prisma.prospect
      .count({ where: { status: { in: ["neu", "kontaktiert", "interesse"] } } })
      .catch(() => 0),
    prisma.prospect.count({ where: { website: "" } }).catch(() => 0),
    prisma.contactPrep
      .count({ where: { status: { not: "kontaktiert" } } })
      .catch(() => 0),
  ]);

  // Kennzahlen berechnen
  const eventsToday = calView.data.filter((e) => isToday(e.start));
  const unreadMails = mailView.data.filter((m) => m.unread);
  const openOffers = offers.filter((o) => o.status === "offen");
  const openOffersSum = openOffers.reduce((s, o) => s + o.total, 0);

  const firstName = (session?.user?.name ?? "").split(" ")[0] || "willkommen";
  const heute = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div>
      <Reveal>
        <PageHeader
          title={`Hallo, ${firstName}`}
          subtitle={heute[0].toUpperCase() + heute.slice(1)}
        />
      </Reveal>

      {/* Hinweis auf neue Anfragen / faellige Wiedervorlagen */}
      {(leadSignals.neu > 0 || leadSignals.wiedervorlage > 0) && (
        <Reveal delay={0.03}>
          <Link
            href="/anfragen"
            className="glass mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:border-accent/30"
          >
            <span className="text-sm">
              {leadSignals.neu > 0 && (
                <span className="font-semibold text-accent">
                  {leadSignals.neu} neue Anfrage{leadSignals.neu === 1 ? "" : "n"}
                </span>
              )}
              {leadSignals.neu > 0 && leadSignals.wiedervorlage > 0 && " · "}
              {leadSignals.wiedervorlage > 0 && (
                <span className="font-semibold text-amber-300">
                  {leadSignals.wiedervorlage} Wiedervorlage
                  {leadSignals.wiedervorlage === 1 ? "" : "n"} fällig
                </span>
              )}
            </span>
            <ArrowRight className="h-4 w-4 text-muted" />
          </Link>
        </Reveal>
      )}

      {/* Kennzahlen */}
      <Reveal delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Termine heute"
            value={eventsToday.length}
            icon={Calendar}
            hint={calView.demo ? "Beispieldaten" : "aus Google Kalender"}
          />
          <StatCard
            label="Ungelesene E-Mails"
            value={unreadMails.length}
            icon={Mail}
            hint={mailView.demo ? "Beispieldaten" : "aus Gmail"}
          />
          <StatCard
            label="Offene Aufträge"
            value={orders.length}
            icon={Briefcase}
            hint="in Bearbeitung"
          />
          <StatCard
            label="Offene Angebote"
            value={formatEuro(openOffersSum)}
            icon={FileText}
            hint={`${openOffers.length} offen`}
          />
        </div>
      </Reveal>

      {/* Akquise-Kennzahlen */}
      <Reveal delay={0.07}>
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Target className="h-[18px] w-[18px] text-accent" />
            Akquise
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <AkquiseStat
              href="/leads"
              label="Offene Leads"
              value={offeneLeads}
              icon={Target}
              hint="neu · kontaktiert · Interesse"
            />
            <AkquiseStat
              href="/leads"
              label="Heiße Leads (ohne Website)"
              value={heisseLeads}
              icon={Flame}
              hint="beste Ansatzpunkte"
            />
            <AkquiseStat
              href="/kontakt-vorbereitung"
              label="In Vorbereitung"
              value={inVorbereitung}
              icon={ClipboardList}
              hint="noch nicht kontaktiert"
            />
          </div>
        </div>
      </Reveal>

      {/* Widgets: zwei Spalten.
          Links: Nächste Termine → Aktuelle Aufträge → To-Dos.
          Rechts: Neueste E-Mails → Schnellzugriff. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {/* Linke Spalte */}
        <div className="flex flex-col gap-6">
          {/* Naechste Termine */}
          <Reveal delay={0.1}>
            <Panel className="p-5">
              <WidgetHead title="Nächste Termine" href="/kalender" icon={Calendar} />
              <ul className="mt-4 flex flex-col gap-3">
                {calView.data.slice(0, 4).map((e) => (
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
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {calView.data.length === 0 && (
                  <li className="text-sm text-muted">Keine anstehenden Termine.</li>
                )}
              </ul>
            </Panel>
          </Reveal>

          {/* Aktuelle Auftraege */}
          <Reveal delay={0.2}>
            <Panel className="p-5">
              <WidgetHead title="Aktuelle Aufträge" href="/auftraege" icon={Briefcase} />
              <ul className="mt-4 flex flex-col gap-3">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{o.title}</div>
                      <div className="truncate text-xs text-muted">
                        {o.customerName || "—"}
                      </div>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </li>
                ))}
                {orders.length === 0 && (
                  <li className="text-sm text-muted">
                    Keine offenen Aufträge.{" "}
                    <Link href="/auftraege" className="text-accent hover:underline">
                      Ersten anlegen →
                    </Link>
                  </li>
                )}
              </ul>
            </Panel>
          </Reveal>

          {/* To-Dos */}
          <Reveal delay={0.3}>
            <Panel className="p-5">
              <WidgetHead title="To-Dos" href="/todos" icon={ListChecks} />
              {todos.length === 0 ? (
                <p className="mt-4 text-sm text-muted">
                  Keine offenen To-Dos.{" "}
                  <Link href="/todos" className="text-accent hover:underline">
                    Neues anlegen →
                  </Link>
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1">
                  {todos.slice(0, 6).map((t) => (
                    <TodoItem key={t.id} id={t.id} text={t.text} done={t.done} />
                  ))}
                </ul>
              )}
            </Panel>
          </Reveal>
        </div>

        {/* Rechte Spalte */}
        <div className="flex flex-col gap-6">
          {/* Neueste E-Mails */}
          <Reveal delay={0.15}>
            <Panel className="p-5">
              <WidgetHead title="Neueste E-Mails" href="/mails" icon={Mail} />
              <ul className="mt-4 flex flex-col gap-3">
                {mailView.data.slice(0, 4).map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <span
                      className={
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                        (m.unread ? "bg-accent" : "bg-white/15")
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {m.fromName}
                        </span>
                        <CategoryBadge category={m.category} />
                      </div>
                      <div className="truncate text-sm text-muted">{m.subject}</div>
                    </div>
                  </li>
                ))}
                {mailView.data.length === 0 && (
                  <li className="text-sm text-muted">Keine E-Mails.</li>
                )}
              </ul>
            </Panel>
          </Reveal>

          {/* Schnellzugriff */}
          <Reveal delay={0.25}>
            <Panel className="p-5">
              <h2 className="font-display text-lg font-semibold">Schnellzugriff</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <QuickAction href="/angebote/neu" icon={FileText} label="Neues Angebot" />
                <QuickAction href="/auftraege" icon={Briefcase} label="Neuer Auftrag" />
                <QuickAction href="/kalender" icon={Calendar} label="Kalender" />
                <QuickAction href="/mails" icon={Mail} label="Posteingang" />
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

// Kopf eines Widgets mit Titel und "alle ansehen"-Link
function WidgetHead({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href: string;
  icon: typeof Calendar;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Icon className="h-[18px] w-[18px] text-accent" />
        {title}
      </h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
      >
        Alle <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// Verlinkte Kennzahl-Kachel fuer die Akquise (StatCard-Optik, klickbar)
function AkquiseStat({
  href,
  label,
  value,
  icon: Icon,
  hint,
}: {
  href: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Link href={href} className="group block">
      <Panel className="p-5 transition-colors group-hover:border-accent/30">
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted">{label}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-accent/10 text-accent">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>
        <div className="mt-3 font-display text-3xl font-bold">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </Panel>
    </Link>
  );
}

// Kachel im Schnellzugriff
function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Calendar;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-line bg-white/5 px-3 py-3 text-sm font-medium transition-colors hover:border-accent/30 hover:bg-accent/10"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      {label}
      <Plus className="ml-auto h-4 w-4 text-muted transition-colors group-hover:text-accent" />
    </Link>
  );
}
