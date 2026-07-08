// Telefon-Bereich: Cold-Call-Skript (editierbar) + Anruf-Notizen.
import { Phone, NotebookPen, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PHONE_SCRIPT } from "@/lib/phone-script";
import { formatDayShort, formatTime } from "@/lib/format";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import ScriptEditor from "./script-editor";
import { createCallNote, deleteCallNote } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

// Anzeige-Infos je Anruf-Ergebnis
const OUTCOMES: Record<string, { label: string; className: string }> = {
  erreicht: { label: "Erreicht", className: "border-accent/30 bg-accent/10 text-accent" },
  nicht_erreicht: { label: "Nicht erreicht", className: "border-line bg-white/5 text-muted" },
  interesse: { label: "Interesse", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  kein_interesse: { label: "Kein Interesse", className: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
  termin: { label: "Termin vereinbart", className: "border-violet-400/30 bg-violet-400/10 text-violet-300" },
};

export default async function TelefonPage() {
  // Skript laden – beim allerersten Aufruf mit der Vorlage anlegen
  const script = await prisma.appText.upsert({
    where: { id: "telefon-skript" },
    update: {},
    create: { id: "telefon-skript", value: DEFAULT_PHONE_SCRIPT },
  });

  // Anruf-Notizen, neueste zuerst
  const notes = await prisma.callNote.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Telefon"
          subtitle="Cold-Call-Leitfaden und Notizen zu jedem Anruf"
        />
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Skript */}
        <Reveal delay={0.05}>
          <Panel className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Phone className="h-[18px] w-[18px] text-accent" />
              Cold-Call-Skript
            </h2>
            <ScriptEditor initial={script.value} />
          </Panel>
        </Reveal>

        {/* Anruf-Notizen */}
        <div className="flex flex-col gap-6">
          <Reveal delay={0.1}>
            <Panel className="p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <NotebookPen className="h-[18px] w-[18px] text-accent" />
                Anruf notieren
              </h2>
              <form action={createCallNote} className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="company" placeholder="Firma *" required className={inputClass} />
                  <input name="contact" placeholder="Ansprechpartner" className={inputClass} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="phone" placeholder="Telefonnummer" className={inputClass} />
                  <select name="outcome" defaultValue="nicht_erreicht" className={inputClass}>
                    {Object.entries(OUTCOMES).map(([value, o]) => (
                      <option key={value} value={value} className="bg-[#0c131f]">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  name="notes"
                  placeholder="Wie ist das Gespräch gelaufen?"
                  className={inputClass + " min-h-20"}
                />
                <input
                  name="nextStep"
                  placeholder="Nächster Schritt (z. B. Freitag 10 Uhr erneut anrufen)"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="glow-accent self-start rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
                >
                  Notiz speichern
                </button>
              </form>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold">
                Letzte Anrufe ({notes.length})
              </h2>
              {notes.length === 0 && (
                <p className="text-sm text-muted">Noch keine Anrufe notiert.</p>
              )}
              <ul className="flex flex-col gap-3">
                {notes.map((n) => {
                  const o = OUTCOMES[n.outcome] ?? OUTCOMES.nicht_erreicht;
                  return (
                    <li key={n.id} className="rounded-xl border border-line bg-white/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{n.company}</span>
                          {n.contact && (
                            <span className="text-xs text-muted">{n.contact}</span>
                          )}
                          {n.phone && (
                            <span className="text-xs text-muted">· {n.phone}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                              o.className
                            }
                          >
                            {o.label}
                          </span>
                          <form action={deleteCallNote}>
                            <input type="hidden" name="id" value={n.id} />
                            <button
                              type="submit"
                              title="Notiz löschen"
                              className="text-muted transition-colors hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </div>
                      {n.notes && <p className="mt-2 text-sm text-muted">{n.notes}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span>
                          {formatDayShort(n.createdAt)} {formatTime(n.createdAt)}
                        </span>
                        {n.nextStep && (
                          <span className="text-accent-2">→ {n.nextStep}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
