// Entwirft per Claude eine Erstkontakt-Mail fuer eine Firma aus der
// Kontakt-Vorbereitung. Muster: api/mails/suggest. KI nur auf Knopfdruck.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { anthropicConfigured } from "@/lib/env";
import { draftErstkontaktMail } from "@/lib/ai";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const body = await request.json();
  const firma = String(body.firma ?? "").trim();
  if (!firma) {
    return new Response("Firma fehlt", { status: 400 });
  }

  const suggestion = await draftErstkontaktMail({
    firma,
    website: String(body.website ?? ""),
    websiteMaengel: String(body.websiteMaengel ?? ""),
    empfohleneLeistungen: String(body.empfohleneLeistungen ?? ""),
    ansprechpartner: String(body.ansprechpartner ?? ""),
  });

  return NextResponse.json({ suggestion, demo: !anthropicConfigured });
}
