// Detailseite eines Angebots: Uebersicht, PDF-Download, Duplizieren, Status.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Copy, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuro, formatDate } from "@/lib/format";
import { LUMIO_USTG_HINWEIS, LUMIO_ZAHLUNGSBEDINGUNGEN } from "@/lib/lumio";
import { Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import StatusSelect from "../status-select";
import { duplicateOffer } from "../actions";
import DeleteOfferButton from "../delete-offer-button";
import AutoDownload from "./auto-download";

export const dynamic = "force-dynamic";

export default async function AngebotDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!offer) notFound();

  const pdfUrl = `/api/angebote/${offer.id}/pdf`;

  return (
    <div>
      {created ? <AutoDownload url={pdfUrl} /> : null}

      <Reveal>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/angebote"
              className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
            </Link>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-gradient">
              Angebot {offer.number}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusSelect id={offer.id} status={offer.status} />
            <form action={duplicateOffer}>
              <input type="hidden" name="id" value={offer.id} />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5"
              >
                <Copy className="h-4 w-4" /> Duplizieren
              </button>
            </form>
            <a
              href={pdfUrl}
              className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              <Download className="h-4 w-4" /> PDF herunterladen
            </a>
            <DeleteOfferButton
              id={offer.id}
              number={offer.number}
              className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
            />
          </div>
        </div>
      </Reveal>

      {created ? (
        <Reveal delay={0.05}>
          <p className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-2">
            Angebot gespeichert. Der PDF-Download startet automatisch. Falls nicht,
            nutze den Button „PDF herunterladen“.
          </p>
        </Reveal>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal delay={0.1}>
          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-muted">Kunde</h2>
            <p className="font-semibold">{offer.customerCompany}</p>
            {offer.customerContact && <p>{offer.customerContact}</p>}
            {offer.customerStreet && <p>{offer.customerStreet}</p>}
            {(offer.customerZip || offer.customerCity) && (
              <p>
                {offer.customerZip} {offer.customerCity}
              </p>
            )}
            {offer.customerEmail && (
              <p className="text-sm text-muted">{offer.customerEmail}</p>
            )}
            {offer.customerPhone && (
              <p className="text-sm text-muted">{offer.customerPhone}</p>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.15}>
          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-muted">
              Angebotsdaten
            </h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Nummer</dt>
              <dd className="text-right font-medium">{offer.number}</dd>
              <dt className="text-muted">Datum</dt>
              <dd className="text-right">{formatDate(offer.date)}</dd>
              <dt className="text-muted">Gültig bis</dt>
              <dd className="text-right">{formatDate(offer.validUntil)}</dd>
            </dl>
          </Panel>
        </Reveal>
      </div>

      <Reveal delay={0.2}>
        <div className="glass mt-6 overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-medium">Pos.</th>
                <th className="px-4 py-3 font-medium">Bezeichnung</th>
                <th className="px-4 py-3 text-right font-medium">Menge</th>
                <th className="px-4 py-3 text-right font-medium">Einzelpreis</th>
                <th className="px-4 py-3 text-right font-medium">Gesamt</th>
              </tr>
            </thead>
            <tbody>
              {offer.items.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{item.position}</td>
                  <td className="px-4 py-3">{item.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatEuro(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatEuro(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.03]">
                <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                  Gesamtsumme (netto)
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold tabular-nums">
                  {formatEuro(offer.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Reveal>

      <p className="mt-3 text-xs text-muted">{LUMIO_USTG_HINWEIS}</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal delay={0.25}>
          <Panel className="p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase text-muted">
              Zahlungsbedingungen
            </h2>
            <p className="text-sm">{LUMIO_ZAHLUNGSBEDINGUNGEN}</p>
          </Panel>
        </Reveal>
        {offer.notes?.trim() ? (
          <Reveal delay={0.3}>
            <Panel className="p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase text-muted">
                Anmerkungen
              </h2>
              <p className="whitespace-pre-wrap text-sm">{offer.notes}</p>
            </Panel>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
