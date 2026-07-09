// Versendet eine E-Mail ueber das verbundene Gmail-Konto des angemeldeten Nutzers.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleClientForUser } from "@/lib/google/client";
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

  if (!to) {
    return NextResponse.json({ ok: false, error: "Empfänger fehlt" }, { status: 400 });
  }

  // OAuth-Client des angemeldeten Nutzers holen
  const client = await getGoogleClientForUser(session.user.id);
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
