// Endpunkt, der das Angebots-PDF erzeugt und zum Download zurueckgibt.
// Laeuft im Node-Runtime, weil die PDF-Bibliothek Node-Funktionen braucht.
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderOfferPdf } from "@/lib/pdf/offer-document";

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

  // Angebot inkl. Positionen laden
  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!offer) {
    return new Response("Angebot nicht gefunden", { status: 404 });
  }

  // PDF erzeugen
  const pdf = await renderOfferPdf(offer);

  // Dateinamen bauen: Angebot_ANG-2026-001_Kundenname.pdf
  const asciiName = offer.customerCompany
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
  const filename = `Angebot_${offer.number}_${asciiName || "Kunde"}.pdf`;

  // Buffer in ein Uint8Array wandeln, damit es als Antwort-Body akzeptiert wird
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
