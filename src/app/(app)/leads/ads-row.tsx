"use client";

// Eine Zeile der Lead-Liste in der ANZEIGEN-Spur.
//
// Bewusst anders als die Website-Zeile: hier zaehlt nicht der Mangel-Score,
// sondern ob der Betrieb freie Kapazitaet hat. Deshalb stehen vorne die
// Mitarbeiterzahl und der Befund aus der Meta-Werbebibliothek, und im
// Aufklapper die Kapazitaetsnotiz aus dem Telefonat.
//
// Status und Notiz liegen in der Spur "ads" (ProspectTrack) — voellig getrennt
// von der Website-Spur. Eine Firma kann hier "neu" sein, obwohl ihr die Website
// schon angeboten wurde.
import { useState, useTransition } from "react";
import { Circle, CheckCircle2, Phone, Globe, ChevronDown, Trash2, Megaphone } from "lucide-react";
import { updateProspectTrack, updateAdsBewertung, deleteProspect } from "./actions";
import { anzeigenLabel, ADS_MIN_MITARBEITER } from "@/lib/spur";

type P = {
  id: string;
  name: string;
  ort: string;
  telefon: string;
  website: string;
  status: string;
  ansprechpartner: string;
  reaktion: string;
  notiz: string;
  mitarbeiter: number | null;
  schaltetAnzeigen: string;
  kapazitaetNotiz: string;
};

const STATUS_OPTIONEN = [
  { key: "neu", label: "neu" },
  { key: "kontaktiert", label: "kontaktiert" },
  { key: "interesse", label: "Interesse" },
  { key: "termin", label: "Termin" },
  { key: "kein_interesse", label: "kein Interesse" },
  { key: "erledigt", label: "erledigt" },
];

export default function AdsRow({ p }: { p: P }) {
  const [, startTransition] = useTransition();
  const [delPending, startDelTransition] = useTransition();
  const [offen, setOffen] = useState(false);

  const kontaktiert = p.status !== "neu";

  // CRM-Felder der Anzeigen-Spur schreiben.
  function submitSpur(felder: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("spur", "ads");
    for (const [k, v] of Object.entries(felder)) fd.set(k, v);
    startTransition(async () => {
      await updateProspectTrack(fd);
    });
  }

  // Bewertungsfelder am Prospect (gelten spurunabhaengig).
  function submitBewertung(felder: Record<string, string>) {
    const fd = new FormData();
    fd.set("id", p.id);
    for (const [k, v] of Object.entries(felder)) fd.set(k, v);
    startTransition(async () => {
      await updateAdsBewertung(fd);
    });
  }

  function leadLoeschen() {
    if (!window.confirm(`„${p.name}" endgültig aus dem Dashboard löschen?`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    startDelTransition(async () => {
      await deleteProspect(fd);
    });
  }

  const anz = anzeigenLabel(p.schaltetAnzeigen);
  const anzTon =
    anz.ton === "gut"
      ? "text-emerald-300/80"
      : anz.ton === "warn"
        ? "text-amber-300/80"
        : "text-muted";

  // Mitarbeiterzahl entscheidet, ob sich ein Paket ueberhaupt rechnet.
  const gross = p.mitarbeiter != null && p.mitarbeiter >= ADS_MIN_MITARBEITER;
  const mitarbeiterKlasse =
    p.mitarbeiter == null
      ? "border-line bg-white/5 text-muted"
      : gross
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
        : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {/* Kreis links: als kontaktiert abhaken (nur diese Spur) */}
        <button
          onClick={() => submitSpur({ kontaktiert: kontaktiert ? "false" : "true" })}
          aria-label={kontaktiert ? "Als offen markieren" : "Als kontaktiert abhaken"}
          title={kontaktiert ? "Als offen markieren" : "Als kontaktiert abhaken"}
          className="shrink-0 text-muted transition-colors hover:text-accent"
        >
          {kontaktiert ? (
            <CheckCircle2 className="h-5 w-5 text-accent" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        {/* Mitarbeiterzahl statt Mangel-Score */}
        <span
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums " +
            mitarbeiterKlasse
          }
          title={
            p.mitarbeiter == null
              ? "Mitarbeiterzahl unbekannt — im Impressum oder auf der Team-Seite nachsehen"
              : gross
                ? `${p.mitarbeiter} Mitarbeiter — Größe passt`
                : `${p.mitarbeiter} Mitarbeiter — unter ${ADS_MIN_MITARBEITER}, Paket rechnet sich kaum`
          }
        >
          {p.mitarbeiter ?? "?"}
        </span>

        {/* Name + Meta */}
        <div className="min-w-0 flex-1">
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
              (p.status === "erledigt" || p.status === "kein_interesse"
                ? "text-muted line-through"
                : "text-ink")
            }
          >
            {p.name}
          </a>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            {p.ort && <span>{p.ort}</span>}
            {p.telefon && (
              <a
                href={`tel:${p.telefon.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1 hover:text-accent"
              >
                <Phone className="h-3 w-3" /> {p.telefon}
              </a>
            )}
            {p.website && (
              <a
                href={p.website.startsWith("http") ? p.website : "https://" + p.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-accent"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            <span className={"inline-flex items-center gap-1 " + anzTon}>
              <Megaphone className="h-3 w-3" /> {anz.text}
            </span>
          </div>
        </div>

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
          <p className="text-xs text-muted">
            Entscheidend ist die freie Kapazität, nicht die Website. Frage im
            Gespräch: „Wie viele Bäder und wie viele Heizungen machen Sie im
            Jahr — und wo hätten Sie mehr Luft?&ldquo;
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Mitarbeiter
              <input
                type="number"
                min={0}
                inputMode="numeric"
                defaultValue={p.mitarbeiter ?? ""}
                onBlur={(e) =>
                  e.target.value !== String(p.mitarbeiter ?? "") &&
                  submitBewertung({ mitarbeiter: e.target.value })
                }
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              Meta-Werbebibliothek
              <select
                defaultValue={p.schaltetAnzeigen}
                onChange={(e) => submitBewertung({ schaltetAnzeigen: e.target.value })}
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="unbekannt">ungeprüft</option>
                <option value="nein">schaltet keine Anzeigen</option>
                <option value="ja">schaltet schon Anzeigen</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              Ansprechpartner
              <input
                defaultValue={p.ansprechpartner}
                onBlur={(e) =>
                  e.target.value !== p.ansprechpartner &&
                  submitSpur({ ansprechpartner: e.target.value })
                }
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted">
              Status
              <select
                defaultValue={p.status}
                onChange={(e) => submitSpur({ status: e.target.value })}
                className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
              >
                {STATUS_OPTIONEN.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted">
            Kapazität (aus dem Telefonat)
            <textarea
              rows={2}
              placeholder="z. B. 14 Bäder/Jahr, Decke 24 · 60 Heizungen, da wäre Luft"
              defaultValue={p.kapazitaetNotiz}
              onBlur={(e) =>
                e.target.value !== p.kapazitaetNotiz &&
                submitBewertung({ kapazitaetNotiz: e.target.value })
              }
              className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted">
            Notiz zur Anzeigen-Spur
            <textarea
              rows={2}
              defaultValue={p.notiz}
              onBlur={(e) => e.target.value !== p.notiz && submitSpur({ notiz: e.target.value })}
              className="rounded-lg border border-line bg-white/5 px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </label>

          <div className="flex justify-end">
            <button
              onClick={leadLoeschen}
              disabled={delPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Lead löschen
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
