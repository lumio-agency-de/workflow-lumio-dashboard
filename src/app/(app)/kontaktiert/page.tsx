// Kontaktiert (Bereich Akquise): Firmen, die per E-Mail bereits angeschrieben
// wurden. Sie landen hier automatisch, sobald der Gmail-Sent-Abgleich den
// Versand des Erstkontakt-Entwurfs (info@) erkennt — oder per manuellem Status.
import { MailCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { brancheLabel } from "@/lib/akquise";
import { googleConfigured } from "@/lib/env";
import { syncKontaktiertMitGmail } from "@/lib/akquise-sync";
import PrepCard, { type PrepData } from "../kontakt-vorbereitung/prep-card";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ branche?: string }> };

export default async function KontaktiertPage(props: PageProps) {
  try {
    return await KontaktiertPageInner(props);
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Kontaktiert" />;
    throw e;
  }
}

async function KontaktiertPageInner({ searchParams }: PageProps) {
  const { branche: brancheParam } = await searchParams;
  const session = await auth();

  // Beim Laden mit dem info@-Sent-Ordner abgleichen (fuellt diese Liste). Nie fatal.
  if (googleConfigured && session?.user?.id) {
    try {
      await syncKontaktiertMitGmail(session.user.id);
    } catch {
      /* optional */
    }
  }

  const gruppen = await prisma.contactPrep.groupBy({
    by: ["branche"],
    where: { status: "kontaktiert" },
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

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Kontaktiert"
          subtitle={`${cards.length} Firmen bereits per Mail angeschrieben`}
        />
      </Reveal>

      {branchenMitDaten.length > 0 && (
        <Reveal delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <a
              href="/kontaktiert"
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
                  href={`/kontaktiert?branche=${encodeURIComponent(b.key)}`}
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

      {cards.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <MailCheck className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              Noch keine kontaktierten Firmen. Sobald eine Erstkontakt-Mail aus dem info@-Postfach
              rausgeht, erscheint die Firma hier automatisch.
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
