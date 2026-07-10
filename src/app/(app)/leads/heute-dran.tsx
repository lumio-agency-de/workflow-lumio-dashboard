"use client";

// "Heute dran"-Liste: die dringendsten Prospects als kompakte Karten mit
// Direktaktionen (anrufen, → Vorbereitung). Priorisierung passiert server-
// seitig (ranking.ts) – hier wird nur angezeigt.
import { useTransition } from "react";
import { Phone, ClipboardList, CalendarClock, Flame } from "lucide-react";
import { scoreClass } from "@/lib/akquise";
import { addFromProspect } from "@/app/(app)/kontakt-vorbereitung/actions";

export type HeuteDranItem = {
  id: string;
  name: string;
  ort: string;
  telefon: string;
  leadScore: number;
  status: string;
  grundHeute: string;
  faellig: boolean;
  hatVorbereitung: boolean;
};

function VorbereitungButton({ id, hat }: { id: string; hat: boolean }) {
  const [pending, start] = useTransition();
  if (hat) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <ClipboardList className="h-3 w-3" /> in Vorbereitung
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        const fd = new FormData();
        fd.set("prospectId", id);
        start(async () => {
          await addFromProspect(fd);
        });
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/5 px-2 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
    >
      <ClipboardList className="h-3 w-3" /> → Vorbereitung
    </button>
  );
}

export default function HeuteDran({ items }: { items: HeuteDranItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Flame className="h-5 w-5 text-accent" /> Heute dran
        <span className="text-sm font-normal text-muted">
          · {items.length} priorisiert
        </span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl border border-line bg-white/[0.03] p-3"
          >
            <div className="flex items-start gap-2">
              <span
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums " +
                  scoreClass(p.leadScore)
                }
                title="Lead-Score"
              >
                {p.leadScore}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {p.name}
                </div>
                {p.ort && (
                  <div className="truncate text-xs text-muted">{p.ort}</div>
                )}
              </div>
            </div>

            <div
              className={
                "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] " +
                (p.faellig
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-line bg-white/5 text-muted")
              }
            >
              <CalendarClock className="h-3 w-3" /> {p.grundHeute}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {p.telefon && (
                <a
                  href={`tel:${p.telefon.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/5 px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  <Phone className="h-3 w-3" /> Anrufen
                </a>
              )}
              <VorbereitungButton id={p.id} hat={p.hatVorbereitung} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
