// Legt fuer alle Firmen einer Branche in der Kontakt-Vorbereitung je einen
// Erstkontakt-Entwurf im info@-Gmail an (kein Versand). Nur auf Knopfdruck.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { entwuerfeFuerBranche } from "@/lib/akquise-sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const body = await request.json();
  const branche = String(body.branche ?? "").trim();
  if (!branche) {
    return new Response("Branche fehlt", { status: 400 });
  }

  const ergebnis = await entwuerfeFuerBranche(branche, session.user.id);
  revalidatePath("/kontakt-vorbereitung");
  return NextResponse.json(ergebnis);
}
