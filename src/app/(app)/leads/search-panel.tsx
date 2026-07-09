"use client";

// "Suche starten"-Bereich: legt einen Such-Auftrag an (Server-Action) und
// zeigt die letzten Auftraege mit Live-Fortschritt. Der leadgen-Runner (Mac/
// VPS) arbeitet die Auftraege ab und schreibt Status/Fortschritt in die DB;
// hier wird nur gepollt. Sobald ein Lauf "fertig" ist, laedt die Seite neu,
// damit die neuen Leads + Branchen-Chips erscheinen.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { BRANCHEN, QUELLEN, brancheLabel } from "@/lib/akquise";
import { Panel } from "@/components/panel";
import { createSearchRequest } from "./actions";

type ReqView = {
  id: string;
  branche: string;
  location: string;
  status: string;
  progress: string;
  newCount: number | null;
  totalCount: number | null;
  error: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

const AKTIV = new Set(["angefragt", "laeuft"]);

export default function SearchPanel({
  initialRequests,
}: {
  initialRequests: ReqView[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<ReqView[]>(initialRequests);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  // IDs, die beim letzten Poll noch liefen – um den Wechsel auf "fertig" zu erkennen.
  const liefen = useRef<Set<string>>(
    new Set(initialRequests.filter((r) => AKTIV.has(r.status)).map((r) => r.id)),
  );

  const esAktiv = requests.some((r) => AKTIV.has(r.status));

  useEffect(() => {
    if (!esAktiv) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/leads/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { requests: ReqView[] };
        setRequests(data.requests);
        // Ist einer der zuletzt laufenden jetzt fertig? -> Seite neu laden.
        const jetztAktiv = new Set(
          data.requests.filter((r) => AKTIV.has(r.status)).map((r) => r.id),
        );
        let fertigGeworden = false;
        liefen.current.forEach((id) => {
          if (!jetztAktiv.has(id)) fertigGeworden = true;
        });
        liefen.current = jetztAktiv;
        if (fertigGeworden) router.refresh();
      } catch {
        // voruebergehender Netzwerkfehler -> naechster Versuch
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [esAktiv, router]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createSearchRequest(formData);
      formRef.current?.reset();
      // Direkt danach den Status ziehen, damit der neue Auftrag sofort auftaucht.
      try {
        const res = await fetch("/api/leads/status", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { requests: ReqView[] };
          setRequests(data.requests);
          liefen.current = new Set(
            data.requests.filter((r) => AKTIV.has(r.status)).map((r) => r.id),
          );
        }
      } catch {
        /* egal */
      }
    });
  }

  return (
    <Panel className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <Target className="h-[18px] w-[18px] text-accent" />
        Neue Suche starten
      </h2>

      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Branche</span>
            <select name="branche" required className={inputClass} defaultValue="heizung-sanitaer">
              {BRANCHEN.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Ort oder PLZ</span>
            <input name="location" required placeholder="z. B. Böblingen" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Umkreis (km)</span>
            <input
              name="radius_km"
              type="number"
              min={1}
              max={200}
              defaultValue={15}
              className={inputClass}
            />
          </label>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer select-none text-accent-2">
            Erweiterte Optionen
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {QUELLEN.map((q) => (
                <label key={q.key} className="flex items-center gap-2 text-muted">
                  <input type="checkbox" name="quellen" value={q.key} defaultChecked />
                  {q.label}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <label className="flex items-center gap-2 text-muted">
                Max. Treffer/Ort
                <input
                  name="limit"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={30}
                  className="w-20 rounded-lg border border-line bg-white/5 px-2 py-1 text-ink"
                />
              </label>
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" name="mit_screenshot" defaultChecked /> Screenshots
              </label>
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" name="mit_ki" defaultChecked /> KI-Bewertung
              </label>
              <label className="flex items-center gap-2 text-muted">
                <input type="checkbox" name="verify_websites" defaultChecked /> Website-Check
              </label>
            </div>
          </div>
        </details>

        <div>
          <button
            type="submit"
            disabled={pending}
            className="glow-accent inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Suche starten
          </button>
        </div>
      </form>

      {/* Laufende / letzte Auftraege */}
      {requests.length > 0 && (
        <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
          {requests.map((r) => (
            <RequestRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function RequestRow({ r }: { r: ReqView }) {
  const aktiv = AKTIV.has(r.status);
  const fehler = r.status === "fehler";
  return (
    <div className="flex items-center gap-3 text-sm">
      {aktiv ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
      ) : fehler ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
      )}
      <span className="text-ink">
        {brancheLabel(r.branche)} · {r.location}
      </span>
      <span className="truncate text-muted">
        {fehler
          ? r.error || "Fehler"
          : aktiv
            ? r.progress || (r.status === "angefragt" ? "wartet auf Runner …" : "läuft …")
            : `fertig${r.newCount != null ? ` · ${r.newCount} neu` : ""}${
                r.totalCount != null ? ` · ${r.totalCount} gesamt` : ""
              }`}
      </span>
    </div>
  );
}
