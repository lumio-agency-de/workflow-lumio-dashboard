// Versendet eine E-Mail ueber das verbundene Gmail-Konto des angemeldeten Nutzers.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoogleClientForUser } from "@/lib/google/client";
import { sendMailWithAttachment } from "@/lib/google/gmail";

export async function POST(request: Request) {
  // Nur angemeldete Nutzer duerfen senden
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet" }, { status: 401 });
  }

  // Eingaben auslesen
  let body: { to?: string; subject?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage" }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const text = String(body.text ?? "");

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
    await sendMailWithAttachment(client, {
      to,
      subject: subject || "(kein Betreff)",
      text,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Senden fehlgeschlagen";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
