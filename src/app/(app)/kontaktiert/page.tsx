// Kontaktiert (Bereich Akquise): Firmen, die per E-Mail bereits angeschrieben
// wurden. Sie landen hier automatisch, sobald der Gmail-Sent-Abgleich den
// Versand des Erstkontakt-Entwurfs (info@) erkennt — oder per manuellem Status.
//
// Die Liste ist in Unterkategorien nach dem ERGEBNIS des Erstkontakts geteilt
// (noch offen / erfolgreich / nicht erfolgreich); umgeschaltet wird oben.
import { MailCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { brancheLabel } from "@/lib/akquise";
import { AKQUISE_KONTEN, colorForUsername, istAkquiseKonto, labelForUsername } from "@/lib/team";
import { formatDate } from "@/lib/format";
import { googleConfigured } from "@/lib/env";
import { syncKontaktiertMitGmail } from "@/lib/akquise-sync";
import PrepCard, { type PrepData } from "../kontakt-vorbereitung/prep-card";
import AbschlussAktionen, { type AbschlussDaten } from "./abschluss-aktionen";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

// Unterkategorien der Seite. "offen" ist der Startwert: angeschrieben, aber
// noch keine Rueckmeldung bewertet.
const ERGEBNISSE = [
  { key: "offen", label: "Noch offen" },
  { key: "erfolgreich", label: "Erfolgreich" },
  { key: "nicht_erfolgreich", label: "Nicht erfolgreich" },
] as const;

type ErgebnisKey = (typeof ERGEBNISSE)[number]["key"];

type PageProps = {
  searchParams: Promise<{ branche?: string; ergebnis?: string; wer?: string }>;
};

export default async function KontaktiertPage(props: PageProps) {
  try {
    return await KontaktiertPageInner(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Kontaktiert" />;
    throw e;
  }
}

async function KontaktiertPageInner({ searchParams }: PageProps) {
  const {
    branche: brancheParam,
    ergebnis: ergebnisParam,
    wer: werParam,
  } = await searchParams;
  const session = await auth();

  // Beim Laden mit dem info@-Sent-Ordner abgleichen (fuellt diese Liste). Nie fatal.
  if (googleConfigured && session?.user?.id) {
    try {
      await syncKontaktiertMitGmail(session.user.id);
    } catch {
      /* optional */
    }
  }

  // Aktive Unterkategorie (Standard: noch offen)
  const aktivesErgebnis: ErgebnisKey = ERGEBNISSE.some((e) => e.key === ergebnisParam)
    ? (ergebnisParam as ErgebnisKey)
    : "offen";

  // Aufteilung nach Konto – wie in der Kontakt-Vorbereitung: jeder sieht
  // beim Oeffnen zuerst seine eigenen Firmen, "Alle" zeigt den Gesamtbestand.
  const eigenesKonto = session?.user?.username ?? "";
  const aktivesKonto =
    werParam === "alle" || istAkquiseKonto(werParam)
      ? werParam
      : istAkquiseKonto(eigenesKonto)
        ? eigenesKonto
        : "alle";
  const kontoFilter = aktivesKonto === "alle" ? {} : { erstelltVon: aktivesKonto };

  // Kontaktierte Firmen je Konto – Zaehler an den Konto-Reitern.
  const proKonto = await prisma.contactPrep.groupBy({
    by: ["erstelltVon"],
    where: { status: "kontaktiert" },
    _count: { _all: true },
  });
  const anzahlKonto = (key: string) =>
    key === "alle"
      ? proKonto.reduce((s, g) => s + g._count._all, 0)
      : (proKonto.find((g) => g.erstelltVon === key)?._count._all ?? 0);
  const ohneKonto = proKonto
    .filter((g) => !istAkquiseKonto(g.erstelltVon))
    .reduce((s, g) => s + g._count._all, 0);

  // Zaehler je Unterkategorie fuer die Umschalter oben (im gewaehlten Konto)
  const ergebnisGruppen = await prisma.contactPrep.groupBy({
    by: ["ergebnis"],
    where: { status: "kontaktiert", ...kontoFilter },
    _count: { _all: true },
  });
  const anzahlJeErgebnis = new Map(
    ergebnisGruppen.map((g) => [g.ergebnis, g._count._all])
  );

  // Branchen-Chips zaehlen nur innerhalb der aktiven Unterkategorie.
  const gruppen = await prisma.contactPrep.groupBy({
    by: ["branche"],
    where: { status: "kontaktiert", ergebnis: aktivesErgebnis, ...kontoFilter },
    _count: { _all: true },
    orderBy: { _count: { branche: "desc" } },
  });
  const branchenMitDaten = gruppen
    .filter((g) => g.branche)
    .map((g) => ({ key: g.branche, count: g._count._all }));

  const aktiveBranche =
    brancheParam && branchenMitDaten.some((b) => b.key === brancheParam)
      ? brancheParam
      : null;

  const preps = await prisma.contactPrep.findMany({
    where: {
      status: "kontaktiert",
      ergebnis: aktivesErgebnis,
      ...kontoFilter,
      ...(aktiveBranche ? { branche: aktiveBranche } : {}),
    },
    orderBy: [{ mailGesendetAm: "desc" }, { updatedAt: "desc" }],
    include: { prospect: { select: { aufhaenger: true } } },
  });

  const pakete = await prisma.package.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { name: true },
  });
  const katalog = pakete.map((p) => p.name);

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
    erstelltVon: p.erstelltVon,
  }));

  // Zusatzdaten fuer die Abschluss-Leiste (Ergebnis, Preisliste, Angebot)
  const abschluss = new Map<string, AbschlussDaten>(
    preps.map((p) => [
      p.id,
      {
        id: p.id,
        firma: p.firma,
        email: p.email,
        ergebnis: p.ergebnis,
        preislisteErstelltAm: p.preislisteErstelltAm
          ? formatDate(p.preislisteErstelltAm)
          : null,
        angebotId: p.angebotId,
        angebotNummer: p.angebotNummer,
      },
    ])
  );

  // Link-Ziel der Umschalter. Das Konto bleibt immer erhalten; der
  // Branchenfilter faellt beim Wechsel der Unterkategorie weg, weil er sich
  // auf die vorherige bezog.
  const href = (opts: { wer?: string; ergebnis?: ErgebnisKey; branche?: string | null }) => {
    const params = new URLSearchParams({ wer: opts.wer ?? aktivesKonto });
    const erg = opts.ergebnis ?? aktivesErgebnis;
    if (erg !== "offen") params.set("ergebnis", erg);
    if (opts.branche) params.set("branche", opts.branche);
    return `/kontaktiert?${params.toString()}`;
  };

  const ergebnisHref = (key: ErgebnisKey) => href({ ergebnis: key });
  const brancheHref = (key: string | null) => href({ branche: key });

  const gesamt = ergebnisGruppen.reduce((s, g) => s + g._count._all, 0);
  const chipBasis =
    "rounded-full border px-3 py-1.5 text-sm transition ";
  const chipAktiv = "border-accent/40 bg-accent/10 text-accent";
  const chipInaktiv = "border-line bg-white/5 text-muted hover:text-ink";

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Kontaktiert"
          subtitle={
            (aktivesKonto === "alle" ? "Alle Konten" : labelForUsername(aktivesKonto)) +
            ` · ${gesamt} Firmen bereits per Mail angeschrieben`
          }
        />
      </Reveal>

      {/* Konto-Reiter: Miko / Nevio / Alle – wie in der Kontakt-Vorbereitung */}
      <Reveal delay={0.02}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {AKQUISE_KONTEN.map((k) => {
            const aktiv = k === aktivesKonto;
            const farbe = colorForUsername(k);
            return (
              <a
                key={k}
                href={href({ wer: k })}
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
            href={href({ wer: "alle" })}
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

      {/* Unterkategorien: nach Ergebnis des Erstkontakts umschalten */}
      <Reveal delay={0.03}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {ERGEBNISSE.map((e) => {
            const aktiv = e.key === aktivesErgebnis;
            return (
              <a
                key={e.key}
                href={ergebnisHref(e.key)}
                className={
                  "rounded-xl border px-4 py-2 text-sm font-medium transition " +
                  (aktiv
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-line bg-white/5 text-muted hover:text-ink")
                }
              >
                {e.label}
                <span className="ml-2 text-xs opacity-70">
                  {anzahlJeErgebnis.get(e.key) ?? 0}
                </span>
              </a>
            );
          })}
        </div>
      </Reveal>

      {branchenMitDaten.length > 0 && (
        <Reveal delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <a
              href={brancheHref(null)}
              className={chipBasis + (!aktiveBranche ? chipAktiv : chipInaktiv)}
            >
              Alle Branchen
            </a>
            {branchenMitDaten.map((b) => (
              <a
                key={b.key}
                href={brancheHref(b.key)}
                className={
                  chipBasis + (b.key === aktiveBranche ? chipAktiv : chipInaktiv)
                }
              >
                {brancheLabel(b.key)}
                <span className="ml-1.5 text-xs opacity-70">{b.count}</span>
              </a>
            ))}
          </div>
        </Reveal>
      )}

      {cards.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <MailCheck className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              {aktivesErgebnis === "offen"
                ? (aktivesKonto === "alle"
                    ? "Keine offenen Kontakte."
                    : `Keine offenen Kontakte bei ${labelForUsername(aktivesKonto)} — schau unter „Alle“.`) +
                  " Sobald eine Erstkontakt-Mail aus dem info@-Postfach rausgeht, erscheint die Firma hier automatisch."
                : `Hier liegt noch keine Firma. Setze das Ergebnis einer Firma unter „Noch offen" auf „${
                    ERGEBNISSE.find((e) => e.key === aktivesErgebnis)?.label
                  }".`}
            </p>
          </div>
        </Reveal>
      ) : (
        <div className="flex flex-col gap-5">
          {cards.map((prep, i) => (
            <Reveal key={prep.id} delay={0.1 + i * 0.03}>
              <PrepCard
                prep={prep}
                katalog={katalog}
                zeigeBesitzer={aktivesKonto === "alle"}
                besitzerWahl
                footer={
                  abschluss.has(prep.id) ? (
                    <AbschlussAktionen daten={abschluss.get(prep.id)!} />
                  ) : null
                }
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
