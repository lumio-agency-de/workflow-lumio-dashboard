"use server";

// Server-Funktionen fuer den Telefon-Bereich (Skript speichern, Anruf-Notizen).
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
}

// Telefon-Skript speichern
export async function savePhoneScript(formData: FormData) {
  await requireAuth();
  const value = String(formData.get("script") ?? "");
  await prisma.appText.upsert({
    where: { id: "telefon-skript" },
    update: { value },
    create: { id: "telefon-skript", value },
  });
  revalidatePath("/telefon");
}

// Anruf-Notiz speichern
export async function createCallNote(formData: FormData) {
  await requireAuth();
  const company = String(formData.get("company") ?? "").trim();
  if (!company) return; // ohne Firma keine Notiz

  await prisma.callNote.create({
    data: {
      company,
      contact: String(formData.get("contact") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      outcome: String(formData.get("outcome") ?? "nicht_erreicht"),
      notes: String(formData.get("notes") ?? "").trim(),
      nextStep: String(formData.get("nextStep") ?? "").trim(),
    },
  });
  revalidatePath("/telefon");
}

// Anruf-Notiz loeschen
export async function deleteCallNote(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.callNote.delete({ where: { id } });
  revalidatePath("/telefon");
}
