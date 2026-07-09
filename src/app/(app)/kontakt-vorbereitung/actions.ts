"use server";

// Server-Actions fuer die Kontakt-Vorbereitung (Bereich Akquise).
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Eine Firma aus der Lead-Liste (Prospect) in die Kontakt-Vorbereitung uebernehmen.
// Kopiert Stammdaten; verknuepft ueber prospectId (1:1). Doppelte werden vermieden.
export async function addFromProspect(formData: FormData) {
  const prospectId = String(formData.get("prospectId") ?? "");
  if (!prospectId) return;

  // Schon vorbereitet? Dann nichts tun.
  const existing = await prisma.contactPrep.findUnique({ where: { prospectId } });
  if (existing) return;

  const p = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!p) return;

  const session = await auth();

  await prisma.contactPrep.create({
    data: {
      prospectId: p.id,
      firma: p.name,
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
  const firma = String(formData.get("firma") ?? "").trim();
  if (!firma) return;

  const session = await auth();

  await prisma.contactPrep.create({
    data: {
      firma,
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
  const id = String(formData.get("id") ?? "");
  if (!id) return;

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
      status: String(formData.get("status") ?? "offen"),
      notiz: String(formData.get("notiz") ?? "").trim(),
    },
  });
  revalidatePath("/kontakt-vorbereitung");
}

// Eine Vorbereitung loeschen.
export async function deletePrep(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.contactPrep.delete({ where: { id } });
  revalidatePath("/kontakt-vorbereitung");
}
