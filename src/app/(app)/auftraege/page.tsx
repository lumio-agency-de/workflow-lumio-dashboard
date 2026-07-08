// Auftrags-Board: Spalten nach Status + Formular zum Anlegen.
import { Briefcase, CalendarClock, Euro } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuro, formatDayShort } from "@/lib/format";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { createOrder } from "./actions";
import OrderStatusSelect from "./order-status-select";
import OrderProgress from "./order-progress";
import OrderDeleteButton from "./order-delete-button";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

// Spalten des Boards
const COLUMNS: { key: string; label: string }[] = [
  { key: "offen", label: "Offen" },
  { key: "in_arbeit", label: "In Arbeit" },
  { key: "wartet", label: "Wartet" },
  { key: "erledigt", label: "Erledigt" },
];

// Farbe je Prioritaet
const PRIORITY: Record<string, string> = {
  niedrig: "text-muted",
  normal: "text-accent",
  hoch: "text-rose-300",
};

export default async function AuftraegePage() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Aufträge"
          subtitle={`${orders.filter((o) => o.status !== "erledigt").length} offen · ${orders.length} gesamt`}
        />
      </Reveal>

      {/* Neuer Auftrag */}
      <Reveal delay={0.05}>
        <Panel className="mb-8 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Briefcase className="h-[18px] w-[18px] text-accent" />
            Neuer Auftrag
          </h2>
          <form action={createOrder} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="title" placeholder="Titel (z. B. Website Bäckerei Müller)" required className={inputClass} />
              <input name="customerName" placeholder="Kunde" className={inputClass} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input name="value" inputMode="decimal" placeholder="Wert € (optional)" className={inputClass} />
              <input name="dueDate" type="date" className={inputClass} />
              <select name="priority" defaultValue="normal" className={inputClass}>
                <option value="niedrig" className="bg-[#0c131f]">Priorität: niedrig</option>
                <option value="normal" className="bg-[#0c131f]">Priorität: normal</option>
                <option value="hoch" className="bg-[#0c131f]">Priorität: hoch</option>
              </select>
            </div>
            <textarea name="description" placeholder="Beschreibung / Notizen (optional)" className={inputClass + " min-h-20"} />
            <button
              type="submit"
              className="glow-accent self-start rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              Auftrag anlegen
            </button>
          </form>
        </Panel>
      </Reveal>

      {/* Board */}
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col, colIndex) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <Reveal key={col.key} delay={0.1 + colIndex * 0.05}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="rounded-full border border-line bg-white/5 px-2 text-xs text-muted">
                    {items.length}
                  </span>
                </div>

                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
                    Keine Aufträge
                  </div>
                )}

                {items.map((o) => (
                  <Panel key={o.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-snug">{o.title}</div>
                        {o.customerName && (
                          <div className="truncate text-xs text-muted">{o.customerName}</div>
                        )}
                      </div>
                      <OrderDeleteButton id={o.id} title={o.title} />
                    </div>

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {o.value > 0 && (
                        <span className="flex items-center gap-1">
                          <Euro className="h-3 w-3" /> {formatEuro(o.value)}
                        </span>
                      )}
                      {o.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" /> {formatDayShort(o.dueDate)}
                        </span>
                      )}
                      <span className={PRIORITY[o.priority] ?? "text-muted"}>
                        ● {o.priority}
                      </span>
                    </div>

                    {/* Fortschritt */}
                    <div className="mt-3">
                      <OrderProgress id={o.id} progress={o.progress} />
                    </div>

                    {/* Status wechseln */}
                    <div className="mt-3">
                      <OrderStatusSelect id={o.id} status={o.status} />
                    </div>
                  </Panel>
                ))}
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
