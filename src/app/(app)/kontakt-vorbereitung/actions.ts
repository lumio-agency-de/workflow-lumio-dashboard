"use server";

// Server-Actions fuer die Kontakt-Vorbereitung (Bereich Akquise).
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureWiedervorlage, entferneWiedervorlage } from "@/lib/akquise-wiedervorlage";

// Nur eingeloggte Nutzer. Server-Actions sind offene POST-Endpunkte – ohne
// diesen Wachposten koennte sie jeder unangemeldet aufrufen.
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  return session;
}

// Eine Firma aus der Lead-Liste (Prospect) in die Kontakt-Vorbereitung uebernehmen.
// Kopiert Stammdaten; verknuepft ueber prospectId (1:1). Doppelte werden vermieden.
export async function addFromProspect(formData: FormData) {
  const session = await requireSession();
  const prospectId = String(formData.get("prospectId") ?? "");
  if (!prospectId) return;

  // Schon vorbereitet? Dann nichts tun.
  const existing = await prisma.contactPrep.findUnique({ where: { prospectId } });
  if (existing) return;

  const p = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!p) return;

  await prisma.contactPrep.create({
    data: {
      prospectId: p.id,
      firma: p.name,
      branche: p.branche,
      ort: p.ort,
      telefon: p.telefon,
      website: p.website,
      ansprechpartner: p.ansprechpartner,
      // Mangel-Hinweis des Lead-Tools als Startpunkt uebernehmen
      websiteMaengel: p.grund,
      websiteStatus: p.website ? "unbekannt" : "keine",
      erstelltVon: session?.user?.username ?? null,
    },
  });
  revalidatePath("/kontakt-vorbereitung");
  // Damit der Button in der Leads-Liste sofort den neuen Status zeigt.
  revalidatePath("/leads");
}

// Eine Firma manuell anlegen (ohne Prospect, z. B. Empfehlung).
export async function addManual(formData: FormData) {
  const session = await requireSession();
  const firma = String(formData.get("firma") ?? "").trim();
  if (!firma) return;

  await prisma.contactPrep.create({
    data: {
      firma,
      branche: String(formData.get("branche") ?? "").trim(),
      ort: String(formData.get("ort") ?? "").trim(),
      telefon: String(formData.get("telefon") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      erstelltVon: session?.user?.username ?? null,
    },
  });
  revalidatePath("/kontakt-vorbereitung");
}

// Eine Vorbereitung speichern (alle bearbeitbaren Felder).
export async function updatePrep(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const status = String(formData.get("status") ?? "offen");

  await prisma.contactPrep.update({
    where: { id },
    data: {
      firma: String(formData.get("firma") ?? "").trim() || "(ohne Namen)",
      ort: String(formData.get("ort") ?? "").trim(),
      telefon: String(formData.get("telefon") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      ansprechpartner: String(formData.get("ansprechpartner") ?? "").trim(),
      websiteStatus: String(formData.get("websiteStatus") ?? "unbekannt"),
      websiteMaengel: String(formData.get("websiteMaengel") ?? "").trim(),
      empfohleneLeistungen: String(formData.get("empfohleneLeistungen") ?? "").trim(),
      kanal: String(formData.get("kanal") ?? "telefon"),
      status,
      notiz: String(formData.get("notiz") ?? "").trim(),
    },
  });

  // Beim Wechsel auf "kontaktiert" (manuell) die Wiedervorlage im Kalender
  // anlegen – 3 Werktage ab jetzt. Der Dubletten-Schutz in ensureWiedervorlage
  // verhindert Mehrfach-Termine beim erneuten Speichern.
  if (status === "kontaktiert" && session.user?.id) {
    try {
      await ensureWiedervorlage(id, session.user.id);
    } catch {
      /* optional – Speichern ist bereits erfolgt */
    }
  }

  revalidatePath("/kontakt-vorbereitung");
}

// Eine Vorbereitung loeschen.
export async function deletePrep(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Zugehoerigen Wiedervorlage-Termin (falls vorhanden) best-effort mitloeschen.
  const prep = await prisma.contactPrep.findUnique({
    where: { id },
    select: { wiedervorlageEventId: true },
  });
  if (prep?.wiedervorlageEventId && session.user?.id) {
    await entferneWiedervorlage(prep.wiedervorlageEventId, session.user.id);
  }

  await prisma.contactPrep.delete({ where: { id } });
  revalidatePath("/kontakt-vorbereitung");
}
