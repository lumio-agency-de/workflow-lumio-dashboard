// Kontakt-Vorbereitung (Bereich Akquise): Firmen aus der Lead-Liste (oder manuell)
// analysieren und den Erstkontakt (Anruf/Mail) vorbereiten.
import { ClipboardList, Plus, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import PrepCard, { type PrepData } from "./prep-card";
import { addFromProspect, addManual } from "./actions";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default async function KontaktVorbereitungPage() {
  // Vorhandene Vorbereitungen (inkl. Herkunft aus dem Lead-Tool)
  const preps = await prisma.contactPrep.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { prospect: { select: { aufhaenger: true } } },
  });

  // Leistungskatalog aus den aktiven Paketen (fuer die Chip-Auswahl)
  const pakete = await prisma.package.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { name: true },
  });
  const katalog = pakete.map((p) => p.name);

  // Firmen aus der Lead-Liste, die noch nicht vorbereitet sind (fuer die Auswahl)
  const offeneProspects = await prisma.prospect.findMany({
    where: { contactPrep: { is: null } },
    orderBy: [{ leadScore: "desc" }, { name: "asc" }],
    take: 100,
    select: { id: true, name: true, ort: true, segment: true },
  });

  const cards: PrepData[] = preps.map((p) => ({
    id: p.id,
    firma: p.firma,
    ort: p.ort,
    telefon: p.telefon,
    email: p.email,
    website: p.website,
    ansprechpartner: p.ansprechpartner,
    websiteStatus: p.websiteStatus,
    websiteMaengel: p.websiteMaengel,
    empfohleneLeistungen: p.empfohleneLeistungen,
    kanal: p.kanal,
    status: p.status,
    notiz: p.notiz,
    ausLeads: !!p.prospectId,
    aufhaenger: p.prospect?.aufhaenger || undefined,
  }));

  const offen = cards.filter((c) => c.status !== "kontaktiert").length;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Kontakt-Vorbereitung"
          subtitle={`${cards.length} Firmen · ${offen} noch offen — Analyse & Planung vor Anruf/Mail`}
        />
      </Reveal>

      {/* Firmen hinzufuegen */}
      <Reveal delay={0.05}>
        <Panel className="mb-8 p-5">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Aus der Lead-Liste uebernehmen */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                <Radar className="h-4 w-4 text-accent" /> Aus Leads übernehmen
              </h2>
              {offeneProspects.length === 0 ? (
                <p className="text-sm text-muted">
                  Keine offenen Firmen in der Lead-Liste. Starte im Bereich{" "}
                  <span className="text-ink">Leads</span> eine Suche.
                </p>
              ) : (
                <form action={addFromProspect} className="flex gap-2">
                  <select name="prospectId" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Firma aus Leads wählen …
                    </option>
                    {offeneProspects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.ort ? ` · ${p.ort}` : ""}
                        {p.segment ? ` · ${p.segment}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="glow-accent flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
                  >
                    <Plus className="h-4 w-4" /> Übernehmen
                  </button>
                </form>
              )}
            </div>

            {/* Manuell anlegen */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
                <Plus className="h-4 w-4 text-accent" /> Manuell hinzufügen
              </h2>
              <form action={addManual} className="flex flex-col gap-2">
                <input name="firma" placeholder="Firmenname" required className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <input name="telefon" placeholder="Telefon" className={inputClass} />
                  <input name="email" placeholder="E-Mail" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input name="website" placeholder="Website" className={inputClass} />
                  <input name="ort" placeholder="Ort" className={inputClass} />
                </div>
                <button
                  type="submit"
                  className="self-start rounded-xl border border-line bg-white/5 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
                >
                  Anlegen
                </button>
              </form>
            </div>
          </div>
        </Panel>
      </Reveal>

      {/* Liste der Vorbereitungen */}
      {cards.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              Noch keine Firmen in der Vorbereitung. Übernimm oben eine Firma aus
              den Leads oder lege manuell eine an.
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-5">
          {cards.map((prep, i) => (
            <Reveal key={prep.id} delay={0.1 + i * 0.03}>
              <PrepCard prep={prep} katalog={katalog} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
