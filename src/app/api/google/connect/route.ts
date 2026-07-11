// Startet die Google-Verbindung: leitet den Nutzer zur Google-Zustimmung weiter.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { googleConfigured } from "@/lib/env";
import { createOAuthClient, GOOGLE_SCOPES } from "@/lib/google/client";
import { isSafeRelativePath } from "@/lib/url";

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

  // Optionales Ziel nach dem Verbinden (nur relative Pfade), z. B. wenn der
  // Connect aus den Nutzer-Einstellungen gestartet wird. Wird als OAuth-"state"
  // durchgereicht und in der Callback-Route ausgewertet.
  const redirectParam = new URL(request.url).searchParams.get("redirect") ?? "";
  // Nur echte, eigene relative Pfade zulassen. "//host" oder "/\\host" sind
  // protokoll-relative URLs (Open-Redirect) und werden verworfen.
  const state = isSafeRelativePath(redirectParam) ? redirectParam : "";

  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline", // damit wir ein refresh_token bekommen
    // "select_account consent": laesst den Nutzer das Konto auswaehlen (noetig,
    // um ein ZUSAETZLICHES Konto zu verbinden) und zeigt die Zustimmung immer
    // an (sichert das refresh_token).
    prompt: "select_account consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    ...(state ? { state } : {}),
  });

  return NextResponse.redirect(url);
}
