// Startet die Google-Verbindung: leitet den Nutzer zur Google-Zustimmung weiter.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { googleConfigured } from "@/lib/env";
import { createOAuthClient, GOOGLE_SCOPES } from "@/lib/google/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }
  // Ohne hinterlegte Zugangsdaten kann keine Verbindung starten
  if (!googleConfigured) {
    return NextResponse.redirect(
      new URL("/kalender?google=nicht_konfiguriert", request.url)
    );
  }

  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline", // damit wir ein refresh_token bekommen
    prompt: "consent", // Zustimmung immer anzeigen (sichert refresh_token)
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
  });

  return NextResponse.redirect(url);
}
