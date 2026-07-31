// Erzeugt die Kunden-Preisliste als PDF zum Download (Bereich Akquise).
// Das PDF wird von Hand als Anhang an eine Mail gehaengt – das Dashboard
// verschickt hier bewusst nichts.
// Laeuft im Node-Runtime, weil die PDF-Bibliothek Node-Funktionen braucht.
export const runtime = "nodejs";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderPreislistePdf } from "@/lib/pdf/preisliste-document";

export async function GET(request: Request) {
  // Schutz: nur eingeloggte Nutzer duerfen PDFs abrufen
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  // Ohne prepId kommt die allgemeine Fassung ohne Firmennamen im Kopf.
  const prepId = new URL(request.url).searchParams.get("prepId")?.trim() ?? "";
  let firma = "";

  if (prepId) {
    const prep = await prisma.contactPrep
      .findUnique({ where: { id: prepId }, select: { firma: true } })
      .catch(() => null);
    if (prep) {
      firma = prep.firma;
      // Merken, dass die Preisliste erstellt wurde – der Angebots-Button fragt
      // sonst nach. Fehlt die Spalte noch (Migration offen), einfach weiter.
      await prisma.contactPrep
        .update({
          where: { id: prepId },
          data: { preislisteErstelltAm: new Date() },
        })
        .catch(() => {});
    }
  }

  const pdf = await renderPreislistePdf(firma);

  // Dateinamen bauen: Lumio_Preisliste_Kundenname.pdf
  const asciiName = firma
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
  const filename = asciiName
    ? `Lumio_Preisliste_${asciiName}.pdf`
    : "Lumio_Preisliste.pdf";

  // Buffer in ein Uint8Array wandeln, damit es als Antwort-Body akzeptiert wird
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
