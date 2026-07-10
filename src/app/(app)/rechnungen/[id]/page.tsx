// Detailseite einer Rechnung: Uebersicht, PDF-Download, Status, Mailversand.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ArrowLeft, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuro, formatDate } from "@/lib/format";
import { LUMIO_USTG_HINWEIS, LUMIO_ZAHLUNGSBEDINGUNGEN } from "@/lib/lumio";
import { effectiveInvoiceStatus } from "@/lib/invoice";
import { Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import InvoiceStatusSelect from "../invoice-status-select";
import InvoiceStatusBadge from "../invoice-status-badge";
import DeleteInvoiceButton from "../delete-invoice-button";
import AutoDownload from "./auto-download";
import InvoiceMailBox from "./invoice-mail-box";

export const dynamic = "force-dynamic";

export default async function RechnungDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; sent?: string }>;
}) {
  const { id } = await params;
  const { created, sent } = await searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();

  const pdfUrl = `/api/rechnungen/${invoice.id}/pdf`;
  const shownStatus = effectiveInvoiceStatus(invoice);
  const isOverdue = shownStatus === "ueberfaellig";

  return (
    <div>
      {created ? <AutoDownload url={pdfUrl} /> : null}

      <Reveal>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/rechnungen"
              className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
            </Link>
            <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-gradient">
              Rechnung {invoice.number}
              <InvoiceStatusBadge status={shownStatus} />
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <InvoiceStatusSelect id={invoice.id} status={invoice.status} />
            <a
              href={pdfUrl}
              className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              <Download className="h-4 w-4" /> PDF herunterladen
            </a>
            <DeleteInvoiceButton
              id={invoice.id}
              number={invoice.number}
              className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-400/10"
            />
          </div>
        </div>
      </Reveal>

      {created ? (
        <Reveal delay={0.05}>
          <p className="mb-6 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-2">
            Rechnung gespeichert. Der PDF-Download startet automatisch. Falls
            nicht, nutze den Button „PDF herunterladen“.
          </p>
        </Reveal>
      ) : null}

      {sent ? (
        <Reveal delay={0.05}>
          <p className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            E-Mail wurde über das info@-Postfach versendet.
          </p>
        </Reveal>
      ) : null}

      {isOverdue ? (
        <Reveal delay={0.05}>
          <p className="mb-6 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Diese Rechnung ist seit dem {formatDate(invoice.dueDate)} überfällig.
            Du kannst unten eine Zahlungserinnerung senden.
          </p>
        </Reveal>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal delay={0.1}>
          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-muted">
              Kunde
            </h2>
            <p className="font-semibold">{invoice.customerCompany}</p>
            {invoice.customerContact && <p>{invoice.customerContact}</p>}
            {invoice.customerStreet && <p>{invoice.customerStreet}</p>}
            {(invoice.customerZip || invoice.customerCity) && (
              <p>
                {invoice.customerZip} {invoice.customerCity}
              </p>
            )}
            {invoice.customerEmail && (
              <p className="text-sm text-muted">{invoice.customerEmail}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-sm text-muted">{invoice.customerPhone}</p>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={0.15}>
          <Panel className="p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase text-muted">
              Rechnungsdaten
            </h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Nummer</dt>
              <dd className="text-right font-medium">{invoice.number}</dd>
              <dt className="text-muted">Datum</dt>
              <dd className="text-right">{formatDate(invoice.date)}</dd>
              <dt className="text-muted">Fällig bis</dt>
              <dd className="text-right">{formatDate(invoice.dueDate)}</dd>
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
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{item.position}</td>
                  <td className="px-4 py-3">{item.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.quantity}
                  </td>
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
                  Rechnungsbetrag (netto)
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold tabular-nums">
                  {formatEuro(invoice.total)}
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
            <p className="text-sm">
              {LUMIO_ZAHLUNGSBEDINGUNGEN} Zahlbar bis zum{" "}
              {formatDate(invoice.dueDate)}.
            </p>
          </Panel>
        </Reveal>
        {invoice.notes?.trim() ? (
          <Reveal delay={0.3}>
            <Panel className="p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase text-muted">
                Anmerkungen
              </h2>
              <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
            </Panel>
          </Reveal>
        ) : null}
      </div>

      {/* Mailversand: Rechnung oder Zahlungserinnerung ueber info@ */}
      <Reveal delay={0.35}>
        <Panel className="mt-6 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase text-muted">
            Per Mail senden
          </h2>
          <InvoiceMailBox
            invoiceId={invoice.id}
            invoiceNumber={invoice.number}
            customerEmail={invoice.customerEmail}
            customerName={invoice.customerCompany}
            dueDateFormatted={formatDate(invoice.dueDate)}
            greetingName="Ihr Lumio-Team"
          />
        </Panel>
      </Reveal>
    </div>
  );
}
