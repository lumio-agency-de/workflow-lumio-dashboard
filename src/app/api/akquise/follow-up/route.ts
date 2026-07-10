// Schlaegt per Claude den naechsten Akquise-Schritt fuer einen Prospect vor.
// Muster: api/mails/suggest. KI nur auf Knopfdruck.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { anthropicConfigured } from "@/lib/env";
import { suggestNextStep } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const body = await request.json();
  const firma = String(body.firma ?? "").trim() || "die Firma";

  const result = await suggestNextStep({
    firma,
    status: String(body.status ?? "neu"),
    reaktion: String(body.reaktion ?? ""),
    notiz: String(body.notiz ?? ""),
  });

  return NextResponse.json({ ...result, demo: !anthropicConfigured });
}
