// Rueckleitung von Google: tauscht den Code gegen Tokens und speichert sie.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOAuthClient } from "@/lib/google/client";
import { isSafeRelativePath } from "@/lib/url";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // Nutzer hat abgebrochen oder es gab einen Fehler
  if (error || !code) {
    return NextResponse.redirect(
      new URL("/kalender?google=abgebrochen", request.url)
    );
  }

  try {
    const client = createOAuthClient();
    // Code gegen Zugriffs-/Refresh-Token tauschen
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verbundene E-Mail-Adresse ermitteln
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    const email = me.data.email ?? "";

    // Ein Nutzer kann MEHRERE Google-Konten verbinden. Existiert bereits eine
    // Zeile mit derselben E-Mail fuer diesen Nutzer, aktualisieren wir sie
    // (Token-Refresh); sonst wird ein NEUES Konto angelegt (statt das
    // bestehende zu ersetzen).
    const existing = await prisma.googleAccount.findFirst({
      where: { userId: session.user.id, email },
      select: { id: true },
    });

    if (existing) {
      await prisma.googleAccount.update({
        where: { id: existing.id },
        data: {
          email,
          accessToken: tokens.access_token ?? "",
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope ?? "",
        },
      });
    } else {
      await prisma.googleAccount.create({
        data: {
          userId: session.user.id,
          email,
          accessToken: tokens.access_token ?? "",
          refreshToken: tokens.refresh_token ?? "",
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope ?? "",
        },
      });
    }

    // Zurueck dorthin, wo der Connect gestartet wurde (via OAuth-"state"),
    // sonst zur Kalender-Seite. Nur relative Pfade zulassen.
    const stateParam = url.searchParams.get("state") ?? "";
    const target = isSafeRelativePath(stateParam) ? stateParam : "/kalender";
    const dest = new URL(target, request.url);
    dest.searchParams.set("google", "verbunden");
    return NextResponse.redirect(dest);
  } catch {
    return NextResponse.redirect(
      new URL("/kalender?google=fehler", request.url)
    );
  }
}
