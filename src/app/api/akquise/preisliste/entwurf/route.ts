// Legt im info@-Postfach einen Gmail-ENTWURF an, an dem die Preisliste als
// PDF haengt (Bereich Akquise -> Kontaktiert). Verschickt wird bewusst nichts:
// der Entwurf wird in Gmail durchgelesen und von Hand abgeschickt.
//
// Laeuft im Node-Runtime, weil die PDF-Bibliothek Node-Funktionen braucht.
export const runtime = "nodejs";
// Gmail-Aufruf mit ~650 KB Anhang braucht etwas Luft (Kaltstart).
export const maxDuration = 60;

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { googleConfigured } from "@/lib/env";
import { getInfoClient } from "@/lib/google/client";
import { createDraft } from "@/lib/google/gmail";
import { PREISLISTE_BETREFF, preislisteMailHtml } from "@/lib/preisliste";

// Mikos kundenfertige Preisliste (2 Seiten A4). Quelle liegt im Firmen-
// Gedaechtnis unter lumio-gedaechtnis/preisliste/ – die Kopie hier muss bei
// jeder Aenderung mitgezogen werden (siehe assets/preisliste/README.md).
// Der Pfad ist in next.config.ts unter outputFileTracingIncludes eingetragen,
// damit die Datei im Vercel-Deployment vorhanden ist.
const PREISLISTE_PDF = path.join(
  process.cwd(),
  "assets/preisliste/Lumio-Preisliste.pdf"
);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ fehler: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prepId = String(body.prepId ?? "").trim();
  if (!prepId) {
    return NextResponse.json({ fehler: "prepId fehlt" }, { status: 400 });
  }

  const prep = await prisma.contactPrep.findUnique({
    where: { id: prepId },
    select: { firma: true, ansprechpartner: true, email: true },
  });
  if (!prep) {
    return NextResponse.json({ fehler: "Firma nicht gefunden" }, { status: 404 });
  }
  if (!prep.email.trim()) {
    return NextResponse.json(
      { fehler: "Für diese Firma ist keine E-Mail-Adresse hinterlegt." },
      { status: 400 }
    );
  }
  if (!googleConfigured) {
    return NextResponse.json({ fehler: "Google ist nicht eingerichtet." }, { status: 400 });
  }

  const client = await getInfoClient(session.user.id);
  if (!client) {
    return NextResponse.json(
      {
        fehler:
          "Kein verbundenes info@-Postfach. Bitte info@ unter Einstellungen mit Google verbinden.",
      },
      { status: 400 }
    );
  }

  // Preisliste einlesen. Fehlt die Datei, lieber gar keinen Entwurf anlegen als
  // eine Mail ohne den Anhang, um den es geht.
  let pdf: Buffer;
  try {
    pdf = fs.readFileSync(PREISLISTE_PDF);
  } catch {
    return NextResponse.json(
      { fehler: "Preislisten-PDF ist im Deployment nicht auffindbar." },
      { status: 500 }
    );
  }

  // Dateinamen bauen: Lumio_Preisliste_Kundenname.pdf
  const asciiName = prep.firma
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

  await createDraft(client, {
    to: prep.email.trim(),
    subject: PREISLISTE_BETREFF,
    html: preislisteMailHtml(prep.firma, prep.ansprechpartner),
    attachment: { filename, data: pdf },
  });

  // Merken, dass die Preisliste raus ist – der Angebots-Button fragt sonst nach.
  // Fehlt die Spalte noch (Migration offen), einfach weiter.
  await prisma.contactPrep
    .update({ where: { id: prepId }, data: { preislisteErstelltAm: new Date() } })
    .catch(() => {});

  revalidatePath("/kontaktiert");
  return NextResponse.json({ erstellt: true, empfaenger: prep.email.trim() });
}
