// Leads-Bereich (Akquise): Suche starten + die daraus entstehenden Listen
// abarbeiten. Die Prospects kommen aus dem leadgen-Tool (via Runner in die
// DB gespuelt); hier werden sie angerufen und abgehakt.
import { Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { brancheLabel } from "@/lib/akquise";
import SearchPanel from "./search-panel";
import ProspectRow from "./prospect-row";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

type LeadsProps = {
  searchParams: Promise<{ branche?: string; nur_offen?: string }>;
};

// Faengt den Fall ab, dass die Prospect-/SearchRequest-Tabellen noch nicht
// migriert sind (dann zeigt die Seite einen Hinweis statt einer 500-Seite).
export default async function LeadsPage(props: LeadsProps) {
  try {
    return await LeadsPageInner(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Leads" />;
    throw e;
  }
}

async function LeadsPageInner({
  searchParams,
}: LeadsProps) {
  const { branche: brancheParam, nur_offen } = await searchParams;
  const nurOffen = nur_offen === "1";

  // Branchen, die tatsaechlich noch offene Prospects haben (+ Anzahl), fuer die
  // Filter-Chips. Firmen, die bereits in der Kontakt-Vorbereitung sind, zaehlen
  // hier nicht mehr mit (sie sind aus der Lead-Liste "verschwunden").
  const gruppen = await prisma.prospect.groupBy({
    by: ["branche"],
    where: { contactPrep: { is: null } },
    _count: { _all: true },
    orderBy: { _count: { branche: "desc" } },
  });
  const branchenMitDaten = gruppen.map((g) => ({
    key: g.branche,
    count: g._count._all,
  }));

  // Aktive Branche: aus der URL, sonst die mit den meisten Prospects.
  const aktiveBranche =
    brancheParam && branchenMitDaten.some((b) => b.key === brancheParam)
      ? brancheParam
      : branchenMitDaten[0]?.key ?? null;

  const prospects = aktiveBranche
    ? await prisma.prospect.findMany({
        where: {
          branche: aktiveBranche,
          // Bereits in die Kontakt-Vorbereitung uebernommene Firmen ausblenden.
          contactPrep: { is: null },
          ...(nurOffen ? { status: { in: ["neu", "kontaktiert", "interesse"] } } : {}),
        },
        orderBy: [{ leadScore: "desc" }, { name: "asc" }],
        take: 500,
      })
    : [];

  const offenGesamt = aktiveBranche
    ? await prisma.prospect.count({
        where: {
          branche: aktiveBranche,
          contactPrep: { is: null },
          status: { in: ["neu", "kontaktiert", "interesse"] },
        },
      })
    : 0;

  // Letzte Such-Auftraege fuer die Fortschrittsanzeige (Runner aktualisiert sie).
  const requests = await prisma.searchRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Leads"
          subtitle="Akquise-Ziele aus dem Lead-Gen-Tool — anrufen und abhaken"
        />
      </Reveal>

      {/* Suche starten */}
      <Reveal delay={0.05}>
        <SearchPanel
          initialRequests={requests.map((r) => ({
            id: r.id,
            branche: r.branche,
            location: r.location,
            status: r.status,
            progress: r.progress,
            newCount: r.newCount,
            totalCount: r.totalCount,
            error: r.error,
          }))}
        />
      </Reveal>

      {/* Branchen-Filter */}
      {branchenMitDaten.length > 0 && (
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {branchenMitDaten.map((b) => {
              const aktiv = b.key === aktiveBranche;
              return (
                <a
                  key={b.key}
                  href={`/leads?branche=${encodeURIComponent(b.key)}${nurOffen ? "&nur_offen=1" : ""}`}
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

      {/* Liste */}
      <Reveal delay={0.15}>
        <Panel className="mt-6 p-5">
          {!aktiveBranche ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Target className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">
                Noch keine Leads vorhanden. Starte oben eine Suche — die
                Ergebnisse erscheinen hier, sobald der Lauf durch ist.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  {brancheLabel(aktiveBranche)}
                  <span className="text-sm font-normal text-muted">
                    · {prospects.length} angezeigt · {offenGesamt} offen
                  </span>
                </h2>
                <a
                  href={`/leads?branche=${encodeURIComponent(aktiveBranche)}${nurOffen ? "" : "&nur_offen=1"}`}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs transition " +
                    (nurOffen
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-white/5 text-muted hover:text-ink")
                  }
                >
                  {nurOffen ? "Alle anzeigen" : "Nur offene"}
                </a>
              </div>

              {prospects.length === 0 ? (
                <p className="py-6 text-sm text-muted">
                  Keine Einträge in diesem Filter.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {prospects.map((p) => (
                    <ProspectRow
                      key={p.id}
                      p={{
                        id: p.id,
                        name: p.name,
                        ort: p.ort,
                        telefon: p.telefon,
                        website: p.website,
                        segment: p.segment,
                        leadScore: p.leadScore,
                        grund: p.grund,
                        aufhaenger: p.aufhaenger,
                        status: p.status,
                        ansprechpartner: p.ansprechpartner,
                        reaktion: p.reaktion,
                        notiz: p.notiz,
                      }}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}
