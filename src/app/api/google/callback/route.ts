// Rueckleitung von Google: tauscht den Code gegen Tokens und speichert sie.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOAuthClient } from "@/lib/google/client";

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

    // Tokens fuer diesen Nutzer speichern (anlegen oder aktualisieren)
    await prisma.googleAccount.upsert({
      where: { userId: session.user.id },
      update: {
        email,
        accessToken: tokens.access_token ?? "",
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? "",
      },
      create: {
        userId: session.user.id,
        email,
        accessToken: tokens.access_token ?? "",
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? "",
      },
    });

    return NextResponse.redirect(
      new URL("/kalender?google=verbunden", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/kalender?google=fehler", request.url)
    );
  }
}
