"use client";

// Monatsansicht des Kalenders mit Vor-/Zurueck-Navigation.
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalEvent } from "@/lib/types";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function CalendarMonth({ events }: { events: CalEvent[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  // Termine nach Tag (YYYY-MM-DD) gruppieren
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = new Date(e.start).toDateString();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  // Alle Zellen des Monats-Rasters berechnen (inkl. Vor-/Nachlauftage)
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    // Wochentag Mo=0 … So=6
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(cursor.year, cursor.month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const changeMonth = (delta: number) => {
    setCursor((c) => {
      const m = c.month + delta;
      const year = c.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  };

  return (
    <div className="glass rounded-2xl p-5">
      {/* Kopf mit Monat + Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}
            className="rounded-lg border border-line px-3 text-xs text-muted transition-colors hover:text-ink"
          >
            Heute
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Wochentage */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Tageszellen (animiert beim Monatswechsel) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${cursor.year}-${cursor.month}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-7 gap-1"
        >
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.month;
            const isToday = d.toDateString() === today.toDateString();
            const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
            return (
              <div
                key={i}
                className={
                  "min-h-20 rounded-lg border p-1.5 text-left " +
                  (inMonth ? "border-line" : "border-transparent opacity-40") +
                  (isToday ? " bg-accent/10 ring-1 ring-accent/40" : "")
                }
              >
                <div className={"text-xs " + (isToday ? "font-bold text-accent" : "text-muted")}>
                  {d.getDate()}
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      title={e.title}
                      className="truncate rounded bg-accent/15 px-1 py-0.5 text-[10px] text-accent-2"
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted">+{dayEvents.length - 3} mehr</div>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
