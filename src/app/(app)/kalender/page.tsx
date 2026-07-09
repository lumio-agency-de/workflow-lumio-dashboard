// Kalender-Seite: Monatsansicht + anstehende Termine (+ Anlegen/Bearbeiten/Loeschen, wenn verbunden).
import { Plus } from "lucide-react";
import { getCalendarView } from "@/lib/dashboard-data";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import GoogleConnectBanner from "@/components/google-connect-banner";
import CalendarMonth from "@/components/calendar-month";
import UpcomingEvents from "@/components/upcoming-events";
import { createEvent } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default async function KalenderPage() {
  const view = await getCalendarView();

  return (
    <div>
      <Reveal>
        <PageHeader title="Kalender" subtitle="Deine Termine im Überblick" />
      </Reveal>

      <Reveal delay={0.05}>
        <GoogleConnectBanner
          configured={view.configured}
          connected={view.connected}
          demo={view.demo}
        />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monatsansicht */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <CalendarMonth events={view.data} />
        </Reveal>

        {/* Seitenspalte */}
        <div className="flex flex-col gap-6">
          {/* Anstehende Termine (bearbeitbar, wenn Google verbunden) */}
          <Reveal delay={0.15}>
            <UpcomingEvents events={view.data} editable={view.connected} />
          </Reveal>

          {/* Termin hinzufuegen (nur wenn Google verbunden) */}
          {view.connected && (
            <Reveal delay={0.2}>
              <Panel className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                  <Plus className="h-[18px] w-[18px] text-accent" />
                  Termin hinzufügen
                </h2>
                <form action={createEvent} className="flex flex-col gap-3">
                  <input name="title" placeholder="Titel" required className={inputClass} />
                  <input name="date" type="date" required className={inputClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Von
                      <input name="startTime" type="time" defaultValue="09:00" className={inputClass} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Bis
                      <input name="endTime" type="time" defaultValue="10:00" className={inputClass} />
                    </label>
                  </div>
                  <input name="location" placeholder="Ort (optional)" className={inputClass} />
                  <button
                    type="submit"
                    className="glow-accent rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
                  >
                    In Google Kalender speichern
                  </button>
                </form>
              </Panel>
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
