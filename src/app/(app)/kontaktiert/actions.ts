"use server";

// Server-Actions des Bereichs "Kontaktiert" (Akquise): Ergebnis des
// Erstkontakts setzen (erfolgreich / nicht erfolgreich / noch offen).
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Erlaubte Unterkategorien – alles andere wird abgewiesen, damit ueber das
// offene Server-Action-POST keine beliebigen Werte in die Spalte wandern.
const ERGEBNISSE = ["offen", "erfolgreich", "nicht_erfolgreich"] as const;
export type Ergebnis = (typeof ERGEBNISSE)[number];

// Nur eingeloggte Nutzer. Server-Actions sind offene POST-Endpunkte – ohne
// diesen Wachposten koennte sie jeder unangemeldet aufrufen.
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  return session;
}

// Ergebnis einer kontaktierten Firma setzen.
export async function setErgebnis(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const wert = String(formData.get("ergebnis") ?? "");
  if (!id) return;
  if (!ERGEBNISSE.includes(wert as Ergebnis)) return;

  await prisma.contactPrep.update({
    where: { id },
    data: { ergebnis: wert },
  });

  revalidatePath("/kontaktiert");
}
