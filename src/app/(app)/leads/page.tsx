// Leads-Bereich (Akquise): Suche starten + die daraus entstehenden Listen
// abarbeiten. Die Prospects kommen aus dem leadgen-Tool (via Runner in die
// DB gespuelt); hier werden sie angerufen und abgehakt.
//
// Zwei Spuren, oben umschaltbar (siehe lib/spur.ts):
//   Website  – Signal ist eine schwache oder fehlende Website
//   Anzeigen – Signal ist freie Kapazitaet; Website-Score sagt hier nichts aus
// Dieselben Firmen, zwei getrennte Verlaeufe. Der Status liegt deshalb in
// ProspectTrack und nicht am Prospect.
import { Target } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Panel, PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { brancheLabel } from "@/lib/akquise";
import {
  SPUREN,
  spurAusParam,
  spurLabel,
  spurHinweis,
  brancheFuerAds,
  OFFENE_STATUS,
  type Spur,
} from "@/lib/spur";
import SearchPanel from "./search-panel";
import ProspectRow from "./prospect-row";
import AdsRow from "./ads-row";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

type LeadsProps = {
  searchParams: Promise<{ spur?: string; branche?: string; nur_offen?: string }>;
};

// Faengt den Fall ab, dass die Prospect-/SearchRequest-/ProspectTrack-Tabellen
// noch nicht migriert sind (dann zeigt die Seite einen Hinweis statt einer
// 500-Seite).
export default async function LeadsPage(props: LeadsProps) {
  try {
    return await LeadsPageInner(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Leads" />;
    throw e;
  }
}

// Firmen ohne Zeile in dieser Spur gelten als "neu" — der leadgen-Runner legt
// nur Prospects an, keine Spuren. Deshalb "keine Zeile ODER offener Status".
function offenFilter(spur: Spur): Prisma.ProspectWhereInput {
  return {
    OR: [
      { tracks: { none: { spur } } },
      { tracks: { some: { spur, status: { in: [...OFFENE_STATUS] } } } },
    ],
  };
}

// Grundfilter je Spur. In der Website-Spur verschwinden Firmen, sobald sie in
// der Kontakt-Vorbereitung liegen — in der Anzeigen-Spur ausdruecklich nicht:
// eine Firma, der wir gerade eine Website anbieten, bleibt ein gueltiger
// Anzeigen-Lead. Genau darum geht die Trennung.
function basisFilter(spur: Spur): Prisma.ProspectWhereInput {
  return spur === "website" ? { contactPrep: { is: null } } : {};
}

async function LeadsPageInner({ searchParams }: LeadsProps) {
  const { spur: spurParam, branche: brancheParam, nur_offen } = await searchParams;
  const spur = spurAusParam(spurParam);
  const nurOffen = nur_offen === "1";

  // Branchen, die in dieser Spur ueberhaupt Firmen haben (+ Anzahl) fuer die
  // Filter-Chips. In der Anzeigen-Spur bleiben nur die freigegebenen Branchen.
  const gruppen = await prisma.prospect.groupBy({
    by: ["branche"],
    where: basisFilter(spur),
    _count: { _all: true },
    orderBy: { _count: { branche: "desc" } },
  });
  const branchenMitDaten = gruppen
    .filter((g) => (spur === "ads" ? brancheFuerAds(g.branche) : true))
    .map((g) => ({ key: g.branche, count: g._count._all }));

  // Aktive Branche: aus der URL, sonst die mit den meisten Firmen.
  const aktiveBranche =
    brancheParam && branchenMitDaten.some((b) => b.key === brancheParam)
      ? brancheParam
      : branchenMitDaten[0]?.key ?? null;

  const where: Prisma.ProspectWhereInput | null = aktiveBranche
    ? {
        branche: aktiveBranche,
        ...basisFilter(spur),
        ...(nurOffen ? offenFilter(spur) : {}),
      }
    : null;

  // Sortierung: in der Website-Spur nach Mangel-Score, in der Anzeigen-Spur
  // nach Betriebsgroesse (grosse Betriebe = mehr freie Kapazitaet moeglich).
  const orderBy: Prisma.ProspectOrderByWithRelationInput[] =
    spur === "ads"
      ? [{ mitarbeiter: { sort: "desc", nulls: "last" } }, { name: "asc" }]
      : [{ leadScore: "desc" }, { name: "asc" }];

  const prospects = where
    ? await prisma.prospect.findMany({
        where,
        orderBy,
        take: 500,
        include: { tracks: { where: { spur } } },
      })
    : [];

  const offenGesamt = aktiveBranche
    ? await prisma.prospect.count({
        where: {
          branche: aktiveBranche,
          ...basisFilter(spur),
          ...offenFilter(spur),
        },
      })
    : 0;

  // Letzte Such-Auftraege fuer die Fortschrittsanzeige (Runner aktualisiert sie).
  const requests = await prisma.searchRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Link-Bauer, damit Spur und Filter beim Klicken erhalten bleiben.
  const href = (o: { spur?: Spur; branche?: string | null; nurOffen?: boolean }) => {
    const p = new URLSearchParams();
    p.set("spur", o.spur ?? spur);
    const b = o.branche === undefined ? aktiveBranche : o.branche;
    if (b) p.set("branche", b);
    if (o.nurOffen ?? nurOffen) p.set("nur_offen", "1");
    return `/leads?${p.toString()}`;
  };

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Leads"
          subtitle="Akquise-Ziele aus dem Lead-Gen-Tool — anrufen und abhaken"
        />
      </Reveal>

      {/* Spur-Umschalter: wechselt das ganze Arbeitsblatt (Liste + Spalten) */}
      <Reveal delay={0.03}>
        <div className="mt-6 flex flex-col gap-2">
          <div className="inline-flex w-fit rounded-xl border border-line bg-white/5 p-1">
            {SPUREN.map((s) => {
              const aktiv = s === spur;
              return (
                <a
                  key={s}
                  href={href({ spur: s, branche: null })}
                  aria-current={aktiv ? "page" : undefined}
                  className={
                    "rounded-lg px-4 py-1.5 text-sm transition " +
                    (aktiv
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:text-ink")
                  }
                >
                  {spurLabel(s)}
                </a>
              );
            })}
          </div>
          <p className="text-xs text-muted">{spurHinweis(spur)}</p>
        </div>
      </Reveal>

      {/* Suche starten — gehoert zum Lead-Gen, nicht zur Spur */}
      <Reveal delay={0.05}>
        <SearchPanel
          spur={spur}
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
                  href={href({ branche: b.key })}
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
              <p className="max-w-md text-sm text-muted">
                {spur === "ads"
                  ? "Noch keine Betriebe in der Anzeigen-Spur. Sie füllt sich aus derselben Lead-Suche — aktuell sind nur Heizung und Sanitär freigegeben, weil sich das Paket nur bei hohen Auftragswerten rechnet."
                  : "Noch keine Leads vorhanden. Starte oben eine Suche — die Ergebnisse erscheinen hier, sobald der Lauf durch ist."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  {brancheLabel(aktiveBranche)}
                  <span className="text-sm font-normal text-muted">
                    · {spurLabel(spur)} · {prospects.length} angezeigt ·{" "}
                    {offenGesamt} offen
                  </span>
                </h2>
                <a
                  href={href({ nurOffen: !nurOffen })}
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
                  {prospects.map((p) => {
                    // Ohne Zeile in dieser Spur gilt die Firma als "neu".
                    const t = p.tracks[0];
                    const gemeinsam = {
                      id: p.id,
                      name: p.name,
                      ort: p.ort,
                      telefon: p.telefon,
                      website: p.website,
                      status: t?.status ?? "neu",
                      ansprechpartner: t?.ansprechpartner ?? "",
                      reaktion: t?.reaktion ?? "",
                      notiz: t?.notiz ?? "",
                    };
                    return spur === "ads" ? (
                      <AdsRow
                        key={p.id}
                        p={{
                          ...gemeinsam,
                          mitarbeiter: p.mitarbeiter,
                          schaltetAnzeigen: p.schaltetAnzeigen,
                          kapazitaetNotiz: p.kapazitaetNotiz,
                        }}
                      />
                    ) : (
                      <ProspectRow
                        key={p.id}
                        p={{
                          ...gemeinsam,
                          segment: p.segment,
                          leadScore: p.leadScore,
                          grund: p.grund,
                          aufhaenger: p.aufhaenger,
                        }}
                      />
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}
