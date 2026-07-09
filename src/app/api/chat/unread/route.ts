// API-Route fuer die Anzahl ungelesener Chat-Nachrichten.
// GET ?since=<ISO-String> -> zaehlt Nachrichten nach <since>, die nicht von mir stammen
//   und entweder im Team-Channel liegen oder DMs an mich sind.
// Fehlt 'since', gibt es nichts Ungelesenes -> { count: 0 }.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Anzahl ungelesener Nachrichten seit einem Zeitpunkt
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const meId = session.user.id;

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");

  // Ohne gueltigen 'since'-Zeitpunkt gibt es (per Definition) nichts Ungelesenes
  if (!since) {
    return NextResponse.json({ count: 0 });
  }
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) {
    return NextResponse.json({ count: 0 });
  }

  // Fehlt die Tabelle (Migration noch nicht ausgefuehrt), nicht crashen -> 0
  try {
    const count = await prisma.chatMessage.count({
      where: {
        createdAt: { gt: sinceDate },
        senderId: { not: meId },
        OR: [
          { scope: "team" },
          { scope: "dm", recipientId: meId },
        ],
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Chat-Unread GET fehlgeschlagen (Tabelle vorhanden?):", error);
    return NextResponse.json({ count: 0 });
  }
}
