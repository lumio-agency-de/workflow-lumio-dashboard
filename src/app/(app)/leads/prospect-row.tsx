"use client";

// Eine Zeile der Lead-Liste: abhaken (kontaktiert), Status setzen, Notiz +
// Reaktion pflegen. Genau diese Felder sind die manuellen CRM-Felder, die der
// leadgen-Sync nie ueberschreibt. Auf-/zuklappbar fuer den Gespraechsaufhaenger.
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Phone,
  Globe,
  ChevronDown,
} from "lucide-react";
import { PROSPECT_STATUS, statusInfo, scoreClass } from "@/lib/akquise";
import { updateProspect } from "./actions";

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
  const [offen, setOffen] = useState(false);
  const kontaktiert = p.status !== "neu";
  const info = statusInfo(p.status);

  function submit(felder: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", p.id);
    for (const [k, v] of Object.entries(felder)) fd.set(k, v);
    startTransition(async () => {
      await updateProspect(fd);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {/* Abhaken */}
        <button
          onClick={() => submit({ kontaktiert: kontaktiert ? "false" : "true" })}
          aria-label={kontaktiert ? "Als offen markieren" : "Als kontaktiert markieren"}
          className="shrink-0 text-muted transition-colors hover:text-accent"
        >
          {kontaktiert ? (
            <CheckCircle2 className="h-5 w-5 text-accent" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
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
          <div className={"truncate text-sm font-medium " + (p.status === "erledigt" ? "text-muted line-through" : "text-ink")}>
            {p.name}
          </div>
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

        {/* Status */}
        <select
          value={p.status}
          onChange={(e) => submit({ status: e.target.value })}
          className={"shrink-0 rounded-lg border px-2 py-1 text-xs " + info.className}
        >
          {PROSPECT_STATUS.map((s) => (
            <option key={s.key} value={s.key} className="bg-[#0c131f] text-ink">
              {s.label}
            </option>
          ))}
        </select>

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
        </div>
      )}
    </li>
  );
}
