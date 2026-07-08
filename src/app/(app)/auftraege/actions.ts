"use server";

// Server-Funktionen fuer Auftraege (anlegen, Status/Fortschritt aendern, loeschen).
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
}

// Euro-Betrag robust aus dem Formular lesen ("1.234,50" -> 1234.5)
function parsePrice(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

// Neuen Auftrag anlegen
export async function createOrder(formData: FormData) {
  await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return; // ohne Titel nichts anlegen

  const dueRaw = String(formData.get("dueDate") ?? "").trim();

  await prisma.order.create({
    data: {
      title,
      customerName: String(formData.get("customerName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      priority: String(formData.get("priority") ?? "normal"),
      value: parsePrice(formData.get("value")),
      dueDate: dueRaw ? new Date(dueRaw) : null,
      status: "offen",
    },
  });

  revalidatePath("/auftraege");
  revalidatePath("/");
}

// Status eines Auftrags aendern (verschiebt die Karte in die andere Spalte)
export async function updateOrderStatus(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "offen");
  if (!id) return;

  // Bei "erledigt" den Fortschritt automatisch auf 100 % setzen
  await prisma.order.update({
    where: { id },
    data: { status, ...(status === "erledigt" ? { progress: 100 } : {}) },
  });

  revalidatePath("/auftraege");
  revalidatePath("/");
}

// Fortschritt (0–100 %) aktualisieren
export async function updateOrderProgress(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  let progress = parseInt(String(formData.get("progress") ?? "0"), 10);
  if (Number.isNaN(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, progress)); // auf 0–100 begrenzen
  if (!id) return;

  await prisma.order.update({ where: { id }, data: { progress } });
  revalidatePath("/auftraege");
}

// Auftrag loeschen
export async function deleteOrder(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.order.delete({ where: { id } });
  revalidatePath("/auftraege");
  revalidatePath("/");
}
