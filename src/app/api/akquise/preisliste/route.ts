// Preisliste an eine bereits kontaktierte Firma schicken (Bereich Akquise).
//
// Zwei Modi, damit nichts ungesehen rausgeht:
//   ohne "senden"  -> nur Vorschau (Betreff + Text) fuer die Anzeige im Dashboard
//   mit  "senden"  -> tatsaechlicher Versand ueber das info@-Postfach
//
// Der Inhalt ist fest (src/lib/preisliste.ts) und enthaelt ausschliesslich die
// oeffentlichen Paketpreise – keine Retainer-/Zusatz-/AI-Preise.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { googleConfigured } from "@/lib/env";
import { getInfoClient } from "@/lib/google/client";
import { sendHtmlMail } from "@/lib/google/gmail";
import {
  PREISLISTE_BETREFF,
  preislisteText,
  preislisteHtml,
} from "@/lib/preisliste";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const body = await request.json();
  const prepId = String(body.prepId ?? "").trim();
  const senden = Boolean(body.senden);
  if (!prepId) {
    return new Response("prepId fehlt", { status: 400 });
  }

  const prep = await prisma.contactPrep.findUnique({
    where: { id: prepId },
    select: { firma: true, ansprechpartner: true, email: true },
  });
  if (!prep) {
    return new Response("Firma nicht gefunden", { status: 404 });
  }

  const text = preislisteText(prep.firma, prep.ansprechpartner);

  // Vorschau: nichts verschicken, nur zurueckgeben.
  if (!senden) {
    return NextResponse.json({
      subject: PREISLISTE_BETREFF,
      body: text,
      empfaenger: prep.email,
    });
  }

  // --- ab hier: echter Versand ---------------------------------------------
  if (!prep.email.trim()) {
    return NextResponse.json(
      { fehler: "Für diese Firma ist keine E-Mail-Adresse hinterlegt." },
      { status: 400 }
    );
  }
  if (!googleConfigured) {
    return NextResponse.json(
      { fehler: "Google ist nicht eingerichtet." },
      { status: 400 }
    );
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

  await sendHtmlMail(client, {
    to: prep.email.trim(),
    subject: PREISLISTE_BETREFF,
    html: preislisteHtml(prep.firma, prep.ansprechpartner),
  });

  await prisma.contactPrep.update({
    where: { id: prepId },
    data: { preislisteGesendetAm: new Date() },
  });

  revalidatePath("/kontaktiert");
  return NextResponse.json({ gesendet: true, empfaenger: prep.email.trim() });
}
