// API-Route fuer den internen Chat (Team-Channel + 1:1-Direktnachrichten).
// GET  ?scope=team                 -> Nachrichten des Team-Channels
// GET  ?scope=dm&with=<userId>     -> Nachrichten der DM-Konversation mit <userId>
// POST { scope, recipientId?, body } -> neue Nachricht als angemeldeter Nutzer anlegen
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Form, in der eine Nachricht ans Frontend geht
export type ChatMessageDTO = {
  id: string;
  senderId: string;
  scope: string;
  recipientId: string | null;
  body: string;
  createdAt: string; // ISO-String
};

// Prisma-Where fuer eine DM-Konversation zwischen mir und dem Gegenueber
function dmWhere(meId: string, withId: string) {
  return {
    scope: "dm",
    OR: [
      { senderId: meId, recipientId: withId },
      { senderId: withId, recipientId: meId },
    ],
  };
}

// GET: Verlauf einer Konversation (chronologisch, aeltest zuerst)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const meId = session.user.id;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "team";

  // Where-Bedingung je nach Konversationstyp bestimmen
  let where: Record<string, unknown>;
  if (scope === "dm") {
    const withId = searchParams.get("with");
    if (!withId) {
      return NextResponse.json(
        { error: "Parameter 'with' fehlt fuer scope=dm" },
        { status: 400 }
      );
    }
    where = dmWhere(meId, withId);
  } else {
    where = { scope: "team" };
  }

  // Fehlt die Tabelle (Migration noch nicht ausgefuehrt), nicht crashen -> leere Liste
  try {
    const rows = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    const messages: ChatMessageDTO[] = rows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      scope: m.scope,
      recipientId: m.recipientId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    }));
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat GET fehlgeschlagen (Tabelle vorhanden?):", error);
    return NextResponse.json({ messages: [] });
  }
}

// POST: neue Nachricht anlegen
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const meId = session.user.id;

  // Eingabe robust auslesen
  let payload: { scope?: string; recipientId?: string | null; body?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungueltiges JSON" }, { status: 400 });
  }

  const scope = payload.scope === "dm" ? "dm" : "team";
  const body = (payload.body ?? "").trim();

  // Validierung: leerer Text nicht erlaubt
  if (!body) {
    return NextResponse.json({ error: "Nachricht darf nicht leer sein" }, { status: 400 });
  }

  // Bei DM ist ein Empfaenger Pflicht (und nicht man selbst)
  let recipientId: string | null = null;
  if (scope === "dm") {
    recipientId = payload.recipientId ?? null;
    if (!recipientId) {
      return NextResponse.json(
        { error: "recipientId fehlt fuer scope=dm" },
        { status: 400 }
      );
    }
    if (recipientId === meId) {
      return NextResponse.json(
        { error: "Nachricht an sich selbst ist nicht erlaubt" },
        { status: 400 }
      );
    }
  }

  try {
    const created = await prisma.chatMessage.create({
      data: { senderId: meId, scope, recipientId, body },
    });
    const message: ChatMessageDTO = {
      id: created.id,
      senderId: created.senderId,
      scope: created.scope,
      recipientId: created.recipientId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
    };
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Chat POST fehlgeschlagen (Tabelle vorhanden?):", error);
    return NextResponse.json(
      { error: "Nachricht konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }
}
