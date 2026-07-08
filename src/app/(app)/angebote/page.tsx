// Angebots-Verlauf: Liste aller bisher erstellten Angebote.
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuro, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import StatusSelect from "./status-select";
import DeleteOfferButton from "./delete-offer-button";

export const dynamic = "force-dynamic";

export default async function AngebotePage() {
  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Reveal>
        <PageHeader
          title="Angebote"
          subtitle={`${offers.length} Angebote insgesamt`}
          action={
            <Link
              href="/angebote/neu"
              className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              <Plus className="h-4 w-4" /> Neues Angebot
            </Link>
          }
        />
      </Reveal>

      {offers.length === 0 ? (
        <Reveal delay={0.05}>
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted">Noch keine Angebote erstellt.</p>
            <Link
              href="/angebote/neu"
              className="mt-3 inline-block font-semibold text-accent hover:underline"
            >
              Jetzt das erste Angebot erstellen →
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
                  <th className="px-4 py-3 text-right font-medium">Summe</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-line last:border-0 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 font-medium">{o.number}</td>
                    <td className="px-4 py-3">{o.customerCompany}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatEuro(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect id={o.id} status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/angebote/${o.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Öffnen
                        </Link>
                        <DeleteOfferButton id={o.id} number={o.number} />
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
