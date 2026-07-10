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
import HeuteDran from "./heute-dran";
import { rankHeuteDran, heuteDranGrund, istFaellig } from "./ranking";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ branche?: string; nur_offen?: string }>;
}) {
  const { branche: brancheParam, nur_offen } = await searchParams;
  const nurOffen = nur_offen === "1";

  // Branchen, die tatsaechlich Prospects haben (+ Anzahl), fuer die Filter-Chips.
  const gruppen = await prisma.prospect.groupBy({
    by: ["branche"],
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
          ...(nurOffen ? { status: { in: ["neu", "kontaktiert", "interesse"] } } : {}),
        },
        orderBy: [{ leadScore: "desc" }, { name: "asc" }],
        take: 500,
        // Mitladen, ob schon eine Kontakt-Vorbereitung existiert (fuer den Button).
        include: { contactPrep: { select: { id: true } } },
      })
    : [];

  const offenGesamt = aktiveBranche
    ? await prisma.prospect.count({
        where: { branche: aktiveBranche, status: { in: ["neu", "kontaktiert", "interesse"] } },
      })
    : 0;

  // "Heute dran": ueber ALLE Branchen die dringendsten Prospects priorisieren
  // (rein regelbasiert, keine KI). Nach faelliger Wiedervorlage + Score laden,
  // damit auch niedrig bewertete, aber faellige Leads sicher dabei sind.
  const now = new Date();
  const heuteKandidaten = await prisma.prospect.findMany({
    where: { status: { in: ["neu", "kontaktiert", "interesse", "termin"] } },
    orderBy: [{ wiedervorlage: { sort: "asc", nulls: "last" } }, { leadScore: "desc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      ort: true,
      telefon: true,
      leadScore: true,
      status: true,
      wiedervorlage: true,
      contactPrep: { select: { id: true } },
    },
  });
  const heuteTop = rankHeuteDran(heuteKandidaten, now, 8).map((p) => ({
    id: p.id,
    name: p.name,
    ort: p.ort,
    telefon: p.telefon,
    leadScore: p.leadScore,
    status: p.status,
    grundHeute: heuteDranGrund(p, now),
    faellig: istFaellig(p.wiedervorlage, now),
    hatVorbereitung: !!p.contactPrep,
  }));

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

      {/* Heute dran: priorisierte Direkt-Liste ueber alle Branchen */}
      {heuteTop.length > 0 && (
        <Reveal delay={0.04}>
          <div className="mb-8">
            <HeuteDran items={heuteTop} />
          </div>
        </Reveal>
      )}

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
                        hatVorbereitung: !!p.contactPrep,
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
