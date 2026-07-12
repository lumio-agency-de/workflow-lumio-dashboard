// Kontakt-Vorbereitung (Bereich Akquise): Firmen aus der Lead-Liste (oder manuell)
// analysieren und den Erstkontakt (Anruf/Mail) vorbereiten. Nach Branche
// filterbar; kontaktierte Firmen wandern automatisch in den Bereich "Kontaktiert".
import { ClipboardList, Plus, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader, Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { BRANCHEN, brancheLabel } from "@/lib/akquise";
import { googleConfigured } from "@/lib/env";
import { syncKontaktiertMitGmail } from "@/lib/akquise-sync";
import PrepCard, { type PrepData } from "./prep-card";
import AkquiseAktionen from "./akquise-aktionen";
import { addFromProspect, addManual } from "./actions";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

type PageProps = { searchParams: Promise<{ branche?: string }> };

// Faengt den Fall ab, dass die ContactPrep-/Prospect-Tabellen noch nicht
// migriert sind (Hinweis statt 500-Seite).
export default async function KontaktVorbereitungPage(props: PageProps) {
  try {
    return await KontaktVorbereitungPageInner(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Kontakt-Vorbereitung" />;
    throw e;
  }
}

async function KontaktVorbereitungPageInner({ searchParams }: PageProps) {
  const { branche: brancheParam } = await searchParams;
  const session = await auth();

  // Vor dem Laden einmal mit dem info@-Sent-Ordner abgleichen: bereits
  // angeschriebene Firmen nach "kontaktiert" schieben. Fehler nie fatal.
  if (googleConfigured && session?.user?.id) {
    try {
      await syncKontaktiertMitGmail(session.user.id);
    } catch {
      /* Abgleich optional – Seite laedt auch ohne Gmail */
    }
  }

  // Branchen mit noch offenen/vorbereiteten Firmen (fuer die Filter-Chips).
  const gruppen = await prisma.contactPrep.groupBy({
    by: ["branche"],
    where: { status: { not: "kontaktiert" } },
    _count: { _all: true },
    orderBy: { _count: { branche: "desc" } },
  });
  const branchenMitDaten = gruppen
    .filter((g) => g.branche) // leere Branche (alte/manuelle Eintraege) nicht als Chip
    .map((g) => ({ key: g.branche, count: g._count._all }));

  const aktiveBranche =
    brancheParam && branchenMitDaten.some((b) => b.key === brancheParam)
      ? brancheParam
      : null;

  // Vorhandene Vorbereitungen (offen/vorbereitet), optional nach Branche gefiltert.
  const preps = await prisma.contactPrep.findMany({
    where: {
      status: { not: "kontaktiert" },
      ...(aktiveBranche ? { branche: aktiveBranche } : {}),
    },
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

      {/* Sammel-Aktionen: Entwuerfe je Branche + Gmail-Abgleich */}
      <Reveal delay={0.04}>
        <Panel className="mb-6 p-5">
          <AkquiseAktionen
            branche={aktiveBranche}
            brancheLabel={aktiveBranche ? brancheLabel(aktiveBranche) : null}
          />
        </Panel>
      </Reveal>

      {/* Firmen hinzufuegen */}
      <Reveal delay={0.05}>
        <Panel className="mb-6 p-5">
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
                <select name="branche" defaultValue="" className={inputClass}>
                  <option value="">Branche wählen (optional) …</option>
                  {BRANCHEN.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </select>
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

      {/* Branchen-Filter */}
      {branchenMitDaten.length > 0 && (
        <Reveal delay={0.08}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <a
              href="/kontakt-vorbereitung"
              className={
                "rounded-full border px-3 py-1.5 text-sm transition " +
                (!aktiveBranche
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line bg-white/5 text-muted hover:text-ink")
              }
            >
              Alle
            </a>
            {branchenMitDaten.map((b) => {
              const aktiv = b.key === aktiveBranche;
              return (
                <a
                  key={b.key}
                  href={`/kontakt-vorbereitung?branche=${encodeURIComponent(b.key)}`}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition " +
                    (aktiv
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-white/5 text-muted hover:text-ink")
                  }
                >
                  {brancheLabel(b.key)}
                  <span className="ml-1.5 text-xs opacity-70">{b.count}</span>
                </a>
              );
            })}
          </div>
        </Reveal>
      )}

      {/* Liste der Vorbereitungen */}
      {cards.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              {aktiveBranche
                ? "Keine offenen Firmen in dieser Branche."
                : "Noch keine Firmen in der Vorbereitung. Übernimm oben eine Firma aus den Leads oder lege manuell eine an."}
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
