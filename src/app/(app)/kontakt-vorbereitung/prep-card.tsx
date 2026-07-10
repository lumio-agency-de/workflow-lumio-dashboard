"use client";

// Eine Firma in der Kontakt-Vorbereitung: Analyse (Website/Maengel/Leistungen)
// + Kontaktdaten + Planung des Erstkontakts. Speichert per Server-Action.
import { useState } from "react";
import { Phone, Mail, Trash2, Save, Plus, Globe, Sparkles } from "lucide-react";
import { updatePrep, deletePrep } from "./actions";

export type PrepData = {
  id: string;
  firma: string;
  ort: string;
  telefon: string;
  email: string;
  website: string;
  ansprechpartner: string;
  websiteStatus: string;
  websiteMaengel: string;
  empfohleneLeistungen: string;
  kanal: string;
  status: string;
  notiz: string;
  ausLeads: boolean;
  aufhaenger?: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

const STATUS = [
  { key: "offen", label: "Offen" },
  { key: "vorbereitet", label: "Vorbereitet" },
  { key: "kontaktiert", label: "Kontaktiert" },
];

export default function PrepCard({
  prep,
  katalog,
}: {
  prep: PrepData;
  katalog: string[];
}) {
  // Ausgewaehlte Leistungen als State (fuer die Chip-Auswahl)
  const initial = prep.empfohleneLeistungen
    ? prep.empfohleneLeistungen.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const [selected, setSelected] = useState<string[]>(initial);
  const [custom, setCustom] = useState("");

  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  const addCustom = () => {
    const v = custom.trim();
    if (v && !selected.includes(v)) setSelected((s) => [...s, v]);
    setCustom("");
  };

  // Angezeigte Chips: Katalog (aus Paketen) + bereits gewaehlte eigene Eintraege
  const chipNames = Array.from(new Set([...katalog, ...selected]));

  return (
    <div className="glass rounded-2xl p-5">
      {/* Kopf: Firma + Schnellkontakt */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{prep.firma}</h3>
            {prep.ausLeads && (
              <span className="rounded-full border border-line bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                aus Leads
              </span>
            )}
          </div>
          {prep.ort && <p className="text-sm text-muted">{prep.ort}</p>}
        </div>
        <div className="flex items-center gap-2">
          {prep.telefon && (
            <a
              href={`tel:${prep.telefon}`}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
            >
              <Phone className="h-3.5 w-3.5" /> Anrufen
            </a>
          )}
          {prep.email && (
            <a
              href={`mailto:${prep.email}`}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
            >
              <Mail className="h-3.5 w-3.5" /> Mail
            </a>
          )}
          {prep.website && (
            <a
              href={prep.website.startsWith("http") ? prep.website : `https://${prep.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
            >
              <Globe className="h-3.5 w-3.5" /> Website
            </a>
          )}
        </div>
      </div>

      {/* Gespraechseinstieg aus dem Lead-Tool (falls vorhanden) */}
      {prep.aufhaenger && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-accent/25 bg-accent/5 p-3 text-sm text-muted">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span><span className="text-ink">Einstieg (Lead-Tool):</span> {prep.aufhaenger}</span>
        </p>
      )}

      <form action={updatePrep} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={prep.id} />
        {/* Ausgewaehlte Leistungen als versteckter, kommagetrennter Wert */}
        <input type="hidden" name="empfohleneLeistungen" value={selected.join(", ")} />

        {/* Kontaktdaten */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Firma
            <input name="firma" defaultValue={prep.firma} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Ansprechpartner
            <input name="ansprechpartner" defaultValue={prep.ansprechpartner} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Telefon
            <input name="telefon" defaultValue={prep.telefon} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            E-Mail
            <input name="email" type="email" defaultValue={prep.email} placeholder="noch heraussuchen" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Website
            <input name="website" defaultValue={prep.website} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Ort
            <input name="ort" defaultValue={prep.ort} className={inputClass} />
          </label>
        </div>

        {/* Website-Analyse */}
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Website-Status
            <select name="websiteStatus" defaultValue={prep.websiteStatus} className={inputClass}>
              <option value="unbekannt">unbekannt</option>
              <option value="keine">keine Website</option>
              <option value="veraltet">veraltet / mangelhaft</option>
              <option value="okay">okay</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Was fehlt / ist falsch an der Website?
            <textarea
              name="websiteMaengel"
              defaultValue={prep.websiteMaengel}
              rows={2}
              placeholder="z. B. nicht mobil, kein Impressum, veraltetes Design, langsam …"
              className={inputClass}
            />
          </label>
        </div>

        {/* Empfohlene Leistungen (Chips aus Paketen + eigene) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Empfohlene Leistungen</span>
          <div className="flex flex-wrap gap-2">
            {chipNames.map((name) => {
              const on = selected.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition " +
                    (on
                      ? "border-accent/40 bg-accent/15 text-accent"
                      : "border-line bg-white/5 text-muted hover:text-ink")
                  }
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="eigene Leistung hinzufügen …"
              className={inputClass + " max-w-xs"}
            />
            <button
              type="button"
              onClick={addCustom}
              className="flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted transition hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" /> Hinzufügen
            </button>
          </div>
        </div>

        {/* Kanal + Status */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 text-xs text-muted">
            Erstkontakt über
            <div className="flex gap-2">
              {[
                { key: "telefon", label: "Telefon" },
                { key: "mail", label: "Mail" },
                { key: "beide", label: "Beides" },
              ].map((k) => (
                <label
                  key={k.key}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-white/5 px-2 py-2 text-sm has-[:checked]:border-accent/40 has-[:checked]:bg-accent/15 has-[:checked]:text-accent"
                >
                  <input
                    type="radio"
                    name="kanal"
                    value={k.key}
                    defaultChecked={prep.kanal === k.key}
                    className="sr-only"
                  />
                  {k.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Status
            <select name="status" defaultValue={prep.status} className={inputClass}>
              {STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Notizen */}
        <label className="flex flex-col gap-1 text-xs text-muted">
          Notizen fürs Gespräch
          <textarea
            name="notiz"
            defaultValue={prep.notiz}
            rows={2}
            placeholder="Gesprächsaufhänger, offene Punkte, Termin-Ideen …"
            className={inputClass}
          />
        </label>

        {/* Aktionen */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
          >
            <Save className="h-4 w-4" /> Speichern
          </button>
        </div>
      </form>

      {/* Loeschen (eigenes Formular, damit es nicht das Speichern ausloest) */}
      <form action={deletePrep} className="mt-2">
        <input type="hidden" name="id" value={prep.id} />
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Entfernen
        </button>
      </form>
    </div>
  );
}
