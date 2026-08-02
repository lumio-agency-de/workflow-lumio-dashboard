// Kontakt-Vorbereitung (Bereich Akquise): Firmen aus der Lead-Liste (oder manuell)
// analysieren und den Erstkontakt (Anruf/Mail) vorbereiten. Nach Branche
// filterbar; kontaktierte Firmen wandern automatisch in den Bereich "Kontaktiert".
import { ClipboardList, Plus, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader, Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { BRANCHEN, brancheLabel } from "@/lib/akquise";
import { AKQUISE_KONTEN, colorForUsername, istAkquiseKonto, labelForUsername } from "@/lib/team";
import { googleConfigured } from "@/lib/env";
import { syncKontaktiertMitGmail } from "@/lib/akquise-sync";
import PrepCard, { type PrepData } from "./prep-card";
import AkquiseAktionen from "./akquise-aktionen";
import { addFromProspect, addManual } from "./actions";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

type PageProps = { searchParams: Promise<{ branche?: string; wer?: string }> };

// Baut einen Link auf diese Seite mit Konto- und Branchen-Auswahl.
function href(wer: string, branche: string | null) {
  const q = new URLSearchParams({ wer });
  if (branche) q.set("branche", branche);
  return `/kontakt-vorbereitung?${q.toString()}`;
}

const chipClass = (aktiv: boolean) =>
  "rounded-full border px-3 py-1.5 text-sm transition " +
  (aktiv
    ? "border-accent/40 bg-accent/10 text-accent"
    : "border-line bg-white/5 text-muted hover:text-ink");

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
  const { branche: brancheParam, wer: werParam } = await searchParams;
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

  // Aufteilung nach Konto: jeder sieht beim Öffnen zuerst SEINE eigenen Firmen.
  // Über den Reiter "Alle" kommt man an den gemeinsamen Bestand (und an alte
  // Einträge, die noch keinem Konto zugeordnet sind).
  const eigenesKonto = session?.user?.username ?? "";
  const aktivesKonto =
    werParam === "alle" || istAkquiseKonto(werParam)
      ? werParam
      : istAkquiseKonto(eigenesKonto)
        ? eigenesKonto
        : "alle";
  const kontoFilter = aktivesKonto === "alle" ? {} : { erstelltVon: aktivesKonto };

  // Offene Firmen je Konto – als Zähler an den Reitern.
  const proKonto = await prisma.contactPrep.groupBy({
    by: ["erstelltVon"],
    where: { status: { not: "kontaktiert" } },
    _count: { _all: true },
  });
  const anzahlKonto = (key: string) =>
    key === "alle"
      ? proKonto.reduce((s, g) => s + g._count._all, 0)
      : (proKonto.find((g) => g.erstelltVon === key)?._count._all ?? 0);
  const ohneKonto = proKonto
    .filter((g) => !istAkquiseKonto(g.erstelltVon))
    .reduce((s, g) => s + g._count._all, 0);

  // Branchen mit noch offenen/vorbereiteten Firmen (fuer die Filter-Chips) –
  // immer im Rahmen des gewaehlten Kontos.
  const gruppen = await prisma.contactPrep.groupBy({
    by: ["branche"],
    where: { status: { not: "kontaktiert" }, ...kontoFilter },
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
      ...kontoFilter,
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
    branche: p.branche,
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
    erstelltVon: p.erstelltVon,
  }));

  const offen = cards.filter((c) => c.status !== "kontaktiert").length;

  // Konto, dem neu übernommene Firmen zugeschlagen werden: das gerade
  // gewählte. Auf "Alle" landet die Firma beim eigenen Konto.
  const zielKonto =
    aktivesKonto === "alle" ? (istAkquiseKonto(eigenesKonto) ? eigenesKonto : "") : aktivesKonto;

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Kontakt-Vorbereitung"
          subtitle={
            (aktivesKonto === "alle" ? "Alle Konten" : labelForUsername(aktivesKonto)) +
            ` · ${cards.length} Firmen · ${offen} noch offen — Analyse & Planung vor Anruf/Mail`
          }
        />
      </Reveal>

      {/* Konto-Reiter: Miko / Nevio / Alle */}
      <Reveal delay={0.02}>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {AKQUISE_KONTEN.map((k) => {
            const aktiv = k === aktivesKonto;
            const farbe = colorForUsername(k);
            return (
              <a
                key={k}
                href={href(k, aktiveBranche)}
                className={
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                  (aktiv ? "" : "border-line bg-white/5 text-muted hover:text-ink")
                }
                style={
                  aktiv
                    ? {
                        borderColor: `${farbe}59`,
                        backgroundColor: `${farbe}1f`,
                        color: farbe,
                      }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: farbe }}
                  aria-hidden
                />
                {labelForUsername(k)}
                <span className="text-xs font-normal opacity-70">{anzahlKonto(k)}</span>
              </a>
            );
          })}
          <a
            href={href("alle", aktiveBranche)}
            className={
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition " +
              (aktivesKonto === "alle"
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line bg-white/5 text-muted hover:text-ink")
            }
          >
            Alle
            <span className="text-xs font-normal opacity-70">{anzahlKonto("alle")}</span>
          </a>
          {aktivesKonto === "alle" && ohneKonto > 0 && (
            <span className="text-xs text-muted">
              {ohneKonto} ohne Zuordnung — unten je Firma auf „Zuständig“ setzen
            </span>
          )}
        </div>
      </Reveal>

      {/* Sammel-Aktionen: Entwuerfe je Branche + Gmail-Abgleich */}
      <Reveal delay={0.04}>
        <Panel className="mb-6 p-5">
          <AkquiseAktionen
            branche={aktiveBranche}
            brancheLabel={aktiveBranche ? brancheLabel(aktiveBranche) : null}
            konto={aktivesKonto === "alle" ? null : aktivesKonto}
            kontoLabel={aktivesKonto === "alle" ? null : labelForUsername(aktivesKonto)}
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
                {zielKonto && (
                  <span className="text-xs font-normal text-muted">
                    → landet bei {labelForUsername(zielKonto)}
                  </span>
                )}
              </h2>
              {offeneProspects.length === 0 ? (
                <p className="text-sm text-muted">
                  Keine offenen Firmen in der Lead-Liste. Starte im Bereich{" "}
                  <span className="text-ink">Leads</span> eine Suche.
                </p>
              ) : (
                <form action={addFromProspect} className="flex gap-2">
                  {/* Konto, dem die Firma zugeschlagen wird (= gewählter Reiter) */}
                  <input type="hidden" name="wer" value={zielKonto} />
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
                <input type="hidden" name="wer" value={zielKonto} />
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
            <a href={href(aktivesKonto, null)} className={chipClass(!aktiveBranche)}>
              Alle Branchen
            </a>
            {branchenMitDaten.map((b) => (
              <a
                key={b.key}
                href={href(aktivesKonto, b.key)}
                className={chipClass(b.key === aktiveBranche)}
              >
                {brancheLabel(b.key)}
                <span className="ml-1.5 text-xs opacity-70">{b.count}</span>
              </a>
            ))}
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
                : aktivesKonto === "alle"
                  ? "Noch keine Firmen in der Vorbereitung. Übernimm oben eine Firma aus den Leads oder lege manuell eine an."
                  : `Keine Firmen bei ${labelForUsername(aktivesKonto)}. Übernimm oben eine Firma aus den Leads – oder schau unter „Alle“.`}
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-5">
          {cards.map((prep, i) => (
            <Reveal key={prep.id} delay={0.1 + i * 0.03}>
              {/* Namens-Marker nur in der Sammelansicht – in Mikos/Nevios
                  eigener Liste sagt schon der Reiter, wem sie gehört. */}
              <PrepCard
                prep={prep}
                katalog={katalog}
                zeigeBesitzer={aktivesKonto === "alle"}
                besitzerWahl
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
