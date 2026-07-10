// Liefert die letzten Such-Auftraege als JSON – der "Suche starten"-Bereich
// pollt diese Route, um Fortschritt/Status live anzuzeigen (der leadgen-Runner
// aktualisiert die Zeilen in der DB).
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const requests = await prisma.searchRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      branche: true,
      location: true,
      status: true,
      progress: true,
      newCount: true,
      totalCount: true,
      error: true,
    },
  });

  return NextResponse.json({ requests });
}
