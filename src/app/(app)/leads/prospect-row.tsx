"use client";

// Eine Zeile der Lead-Liste: ueber den Kreis links direkt in die
// Kontakt-Vorbereitung uebernehmen (die Firma verschwindet dann aus dieser
// Liste), sowie Notiz + Reaktion pflegen. Das sind die manuellen CRM-Felder,
// die der leadgen-Sync nie ueberschreibt. Auf-/zuklappbar fuer den Aufhaenger.
import { useState, useTransition } from "react";
import {
  Circle,
  Phone,
  Globe,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { scoreClass } from "@/lib/akquise";
import { updateProspect, deleteProspect } from "./actions";
import { addFromProspect } from "@/app/(app)/kontakt-vorbereitung/actions";

type P = {
  id: string;
  name: string;
  ort: string;
  telefon: string;
  website: string;
  segment: string;
  leadScore: number;
  grund: string;
  aufhaenger: string;
  status: string;
  ansprechpartner: string;
  reaktion: string;
  notiz: string;
};

export default function ProspectRow({ p }: { p: P }) {
  const [, startTransition] = useTransition();
  const [prepPending, startPrepTransition] = useTransition();
  const [offen, setOffen] = useState(false);

  // KI-Follow-up ("naechster Schritt") – nur auf Knopfdruck.
  type FollowUp = {
    schritt: string;
    text: string;
    wiedervorlageInTagen: number | null;
  };
  const [fu, setFu] = useState<FollowUp | null>(null);
  const [fuLoading, setFuLoading] = useState(false);
  const [fuError, setFuError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wvSet, setWvSet] = useState(false);

  async function loadNextStep() {
    setFuLoading(true);
    setFuError(false);
    setCopied(false);
    setWvSet(false);
    try {
      const res = await fetch("/api/akquise/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firma: p.name,
          status: p.status,
          reaktion: p.reaktion,
          notiz: p.notiz,
        }),
      });
      if (!res.ok) throw new Error("Fehler");
      const data = (await res.json()) as FollowUp;
      setFu({
        schritt: data.schritt,
        text: data.text,
        wiedervorlageInTagen: data.wiedervorlageInTagen ?? null,
      });
    } catch {
      setFuError(true);
    } finally {
      setFuLoading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // Wiedervorlage in N Tagen setzen (nutzt das vorhandene Feld).
  function setWiedervorlage(tage: number) {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    d.setHours(9, 0, 0, 0);
    submit({ wiedervorlage: d.toISOString() });
    setWvSet(true);
  }

  function submit(felder: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", p.id);
    for (const [k, v] of Object.entries(felder)) fd.set(k, v);
    startTransition(async () => {
      await updateProspect(fd);
    });
  }

  // Diesen Lead in die Kontakt-Vorbereitung uebernehmen.
  function inVorbereitung() {
    const fd = new FormData();
    fd.set("prospectId", p.id);
    startPrepTransition(async () => {
      await addFromProspect(fd);
    });
  }

  // Lead endgueltig aus dem Dashboard loeschen (mit Rueckfrage).
  const [delPending, startDelTransition] = useTransition();
  function leadLoeschen() {
    if (!window.confirm(`„${p.name}" endgültig aus dem Dashboard löschen?`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    startDelTransition(async () => {
      await deleteProspect(fd);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {/* Kreis links: Firma direkt in die Kontakt-Vorbereitung uebernehmen
            (danach verschwindet sie aus dieser Liste). */}
        <button
          onClick={inVorbereitung}
          disabled={prepPending}
          aria-label="In Kontakt-Vorbereitung übernehmen"
          title="In Kontakt-Vorbereitung übernehmen"
          className="shrink-0 text-muted transition-colors hover:text-accent disabled:opacity-50"
        >
          <Circle className="h-5 w-5" />
        </button>

        {/* Score */}
        <span
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums " +
            scoreClass(p.leadScore)
          }
          title={p.segment || "Lead-Score"}
        >
          {p.leadScore}
        </span>

        {/* Name + Meta */}
        <div className="min-w-0 flex-1">
          {/* Name -> direkt eine Google-Suche (Name + Ort) oeffnen, um schnell
              Telefonnummer, Oeffnungszeiten oder Website zu finden. */}
          <a
            href={
              "https://www.google.com/search?q=" +
              encodeURIComponent([p.name, p.ort].filter(Boolean).join(" "))
            }
            target="_blank"
            rel="noreferrer"
            title="Bei Google suchen"
            className={
              "block truncate text-sm font-medium underline-offset-2 transition-colors hover:text-accent hover:underline " +
              (p.status === "erledigt" ? "text-muted line-through" : "text-ink")
            }
          >
            {p.name}
          </a>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            {p.ort && <span>{p.ort}</span>}
            {p.telefon && (
              <a href={`tel:${p.telefon.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-accent">
                <Phone className="h-3 w-3" /> {p.telefon}
              </a>
            )}
            {p.website ? (
              <a
                href={p.website.startsWith("http") ? p.website : "https://" + p.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-300/80">
                <Globe className="h-3 w-3" /> keine Website
              </span>
            )}
          </div>
        </div>

        {/* Aufklappen */}
        <button
          onClick={() => setOffen((o) => !o)}
          aria-label="Details"
          className="shrink-0 text-muted transition-colors hover:text-ink"
        >
          <ChevronDown className={"h-4 w-4 transition-transform " + (offen ? "rotate-180" : "")} />
        </button>
      </div>

      {offen && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line bg-white/[0.03] p-4">
          {p.aufhaenger && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted">Gesprächsaufhänger</div>
              <p className="text-sm text-ink">{p.aufhaenger}</p>
            </div>
          )}
          {p.grund && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted">Hauptmangel</div>
              <p className="text-sm text-muted">{p.grund}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Ansprechpartner
              <input
                defaultValue={p.ansprechpartner}
                onBlur={(e) => e.target.value !== p.ansprechpartner && submit({ ansprechpartner: e.target.value })}
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Reaktion
              <input
                defaultValue={p.reaktion}
                onBlur={(e) => e.target.value !== p.reaktion && submit({ reaktion: e.target.value })}
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Notiz
            <textarea
              defaultValue={p.notiz}
              onBlur={(e) => e.target.value !== p.notiz && submit({ notiz: e.target.value })}
              rows={2}
              className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          {/* KI-Follow-up: naechster Schritt */}
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={loadNextStep}
              disabled={fuLoading}
              className="flex w-fit items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {fuLoading ? "Denkt nach …" : "Nächster Schritt (KI)"}
            </button>

            {fuError && (
              <p className="text-xs text-rose-400">
                Vorschlag konnte nicht geladen werden.
              </p>
            )}

            {fu && (
              <div className="flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/5 p-3">
                <div>
                  <div className="mb-0.5 text-xs uppercase tracking-wide text-accent">
                    Empfehlung
                  </div>
                  <p className="text-sm font-medium text-ink">{fu.schritt}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted">{fu.text}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyText(fu.text)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/5 px-2 py-1 text-xs text-muted transition-colors hover:text-ink"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-300" /> Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Kopieren
                      </>
                    )}
                  </button>
                  {fu.wiedervorlageInTagen != null && (
                    <button
                      type="button"
                      onClick={() => setWiedervorlage(fu.wiedervorlageInTagen as number)}
                      disabled={wvSet}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white/5 px-2 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
                    >
                      <CalendarClock className="h-3 w-3" />
                      {wvSet
                        ? "Wiedervorlage gesetzt"
                        : `Wiedervorlage in ${fu.wiedervorlageInTagen} Tagen`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lead endgueltig aus dem Dashboard loeschen */}
          <div className="flex justify-end border-t border-line pt-3">
            <button
              type="button"
              onClick={leadLoeschen}
              disabled={delPending}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {delPending ? "Löscht …" : "Lead löschen"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
