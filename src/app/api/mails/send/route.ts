// Versendet eine E-Mail ueber das verbundene Gmail-Konto des angemeldeten Nutzers.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getGoogleClientForAccount,
  getGoogleClientForUser,
} from "@/lib/google/client";
import { sendMailWithAttachment, getMessageMeta } from "@/lib/google/gmail";

export async function POST(request: Request) {
  // Nur angemeldete Nutzer duerfen senden
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet" }, { status: 401 });
  }

  // Eingaben auslesen
  let body: {
    to?: string;
    subject?: string;
    text?: string;
    cc?: string;
    replyToMessageId?: string;
    // Konkretes Postfach (GoogleAccount.id), aus dem gesendet werden soll –
    // z. B. das Konto, in dem die beantwortete Mail einging.
    accountId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage" }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const text = String(body.text ?? "");
  const cc = String(body.cc ?? "").trim();
  const replyToMessageId = String(body.replyToMessageId ?? "").trim();
  const accountId = String(body.accountId ?? "").trim();

  if (!to) {
    return NextResponse.json({ ok: false, error: "Empfänger fehlt" }, { status: 400 });
  }

  // Passendes Postfach waehlen: Ist eine Konto-ID angegeben (z. B. das Postfach,
  // in dem die beantwortete Mail einging), MUSS ueber genau dieses Konto
  // gesendet werden – die Threading-IDs sind nur dort gueltig. Erlaubt sind nur
  // eigene Konten oder das gemeinsame info@-Postfach (die auf der Mail-Seite
  // sichtbaren Postfaecher). Sonst: primaeres Konto des angemeldeten Nutzers.
  let client: Awaited<ReturnType<typeof getGoogleClientForAccount>> = null;
  if (accountId) {
    const acc = await prisma.googleAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, user: { select: { username: true } } },
    });
    const allowed =
      acc && (acc.userId === session.user.id || acc.user.username === "info");
    if (allowed) {
      client = await getGoogleClientForAccount(accountId);
    }
  }
  if (!client) {
    // Fallback: primaeres Konto des angemeldeten Nutzers
    client = await getGoogleClientForUser(session.user.id);
  }
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "Dein Google-Konto ist nicht verbunden" },
      { status: 400 }
    );
  }

  // Mail wirklich versenden
  try {
    // Bei einer Antwort die Threading-Angaben der Ursprungs-Mail holen
    let inReplyTo: string | undefined;
    let references: string | undefined;
    let threadId: string | undefined;
    if (replyToMessageId) {
      const meta = await getMessageMeta(client, replyToMessageId);
      if (meta.messageIdHeader) {
        inReplyTo = meta.messageIdHeader;
        references = meta.messageIdHeader;
      }
      if (meta.threadId) threadId = meta.threadId;
    }

    await sendMailWithAttachment(client, {
      to,
      subject: subject || "(kein Betreff)",
      text,
      cc: cc || undefined,
      inReplyTo,
      references,
      threadId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Senden fehlgeschlagen";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
