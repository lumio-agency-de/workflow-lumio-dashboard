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
  searchParams: Promise<{ branche?: string; ergebnis?: string }>;
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
  const { branche: brancheParam, ergebnis: ergebnisParam } = await searchParams;
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

  // Zaehler je Unterkategorie fuer die Umschalter oben
  const ergebnisGruppen = await prisma.contactPrep.groupBy({
    by: ["ergebnis"],
    where: { status: "kontaktiert" },
    _count: { _all: true },
  });
  const anzahlJeErgebnis = new Map(
    ergebnisGruppen.map((g) => [g.ergebnis, g._count._all])
  );

  // Branchen-Chips zaehlen nur innerhalb der aktiven Unterkategorie.
  const gruppen = await prisma.contactPrep.groupBy({
    by: ["branche"],
    where: { status: "kontaktiert", ergebnis: aktivesErgebnis },
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
        preislisteGesendetAm: p.preislisteGesendetAm
          ? formatDate(p.preislisteGesendetAm)
          : null,
        angebotId: p.angebotId,
        angebotNummer: p.angebotNummer,
      },
    ])
  );

  // Link-Ziel fuer die Umschalter: Branchenfilter faellt beim Wechsel weg,
  // weil er sich auf die vorherige Unterkategorie bezog.
  const ergebnisHref = (key: ErgebnisKey) =>
    key === "offen" ? "/kontaktiert" : `/kontaktiert?ergebnis=${key}`;

  const brancheHref = (key: string | null) => {
    const params = new URLSearchParams();
    if (aktivesErgebnis !== "offen") params.set("ergebnis", aktivesErgebnis);
    if (key) params.set("branche", key);
    const qs = params.toString();
    return qs ? `/kontaktiert?${qs}` : "/kontaktiert";
  };

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
          subtitle={`${gesamt} Firmen bereits per Mail angeschrieben`}
        />
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
              Alle
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
                ? "Keine offenen Kontakte. Sobald eine Erstkontakt-Mail aus dem info@-Postfach rausgeht, erscheint die Firma hier automatisch."
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
