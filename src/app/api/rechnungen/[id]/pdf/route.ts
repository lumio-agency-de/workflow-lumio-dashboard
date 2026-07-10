// Endpunkt, der das Rechnungs-PDF erzeugt und zum Download zurueckgibt.
// Laeuft im Node-Runtime, weil die PDF-Bibliothek Node-Funktionen braucht.
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdf } from "@/lib/pdf/invoice-document";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Schutz: nur eingeloggte Nutzer duerfen PDFs abrufen
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  // In Next.js 16 ist params asynchron -> mit await auslesen
  const { id } = await context.params;

  // Rechnung inkl. Positionen laden
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) {
    return new Response("Rechnung nicht gefunden", { status: 404 });
  }

  // PDF erzeugen
  const pdf = await renderInvoicePdf(invoice);

  // Dateinamen bauen: Rechnung_RE-2026-001_Kundenname.pdf
  const asciiName = invoice.customerCompany
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "") // alles Nicht-ASCII entfernen
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const filename = `Rechnung_${invoice.number}_${asciiName || "Kunde"}.pdf`;

  // Buffer in ein Uint8Array wandeln, damit es als Antwort-Body akzeptiert wird
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
