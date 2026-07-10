// Rechnungs-Verlauf: Liste aller bisher erstellten Rechnungen (mit Status).
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuro, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { effectiveInvoiceStatus } from "@/lib/invoice";
import { DbUnavailable, isMissingTableError } from "@/components/db-unavailable";
import InvoiceStatusBadge from "./invoice-status-badge";
import DeleteInvoiceButton from "./delete-invoice-button";

export const dynamic = "force-dynamic";

// Faengt den Fall ab, dass die Invoice-Tabelle noch nicht migriert ist.
export default async function RechnungenPage() {
  try {
    return await RechnungenPageInner();
  } catch (e) {
    if (isMissingTableError(e)) return <DbUnavailable titel="Rechnungen" />;
    throw e;
  }
}

async function RechnungenPageInner() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Offener Betrag = alle noch nicht bezahlten Rechnungen (offen + ueberfaellig)
  const openSum = invoices
    .filter((i) => i.status !== "bezahlt")
    .reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Rechnungen"
          subtitle={`${invoices.length} Rechnungen · ${formatEuro(openSum)} offen`}
          action={
            <Link
              href="/rechnungen/neu"
              className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              <Plus className="h-4 w-4" /> Neue Rechnung
            </Link>
          }
        />
      </Reveal>

      {invoices.length === 0 ? (
        <Reveal delay={0.05}>
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted">Noch keine Rechnungen erstellt.</p>
            <Link
              href="/rechnungen/neu"
              className="mt-3 inline-block font-semibold text-accent hover:underline"
            >
              Jetzt die erste Rechnung erstellen →
            </Link>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.05}>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-4 py-3 font-medium">Nummer</th>
                  <th className="px-4 py-3 font-medium">Kunde</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Fällig</th>
                  <th className="px-4 py-3 text-right font-medium">Betrag</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-line last:border-0 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium">{inv.number}</td>
                    <td className="px-4 py-3">{inv.customerCompany}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatEuro(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={effectiveInvoiceStatus(inv)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/rechnungen/${inv.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Öffnen
                        </Link>
                        <DeleteInvoiceButton id={inv.id} number={inv.number} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      )}
    </div>
  );
}
