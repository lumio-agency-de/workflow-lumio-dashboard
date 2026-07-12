// Gleicht die Kontakt-Vorbereitung mit dem info@-Ordner "Gesendet" ab und
// verschiebt angeschriebene Firmen nach "kontaktiert". Auf Knopfdruck.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { syncKontaktiertMitGmail } from "@/lib/akquise-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Nicht angemeldet", { status: 401 });
  }

  const verschoben = await syncKontaktiertMitGmail(session.user.id);
  revalidatePath("/kontakt-vorbereitung");
  revalidatePath("/kontaktiert");
  return NextResponse.json({ verschoben });
}
