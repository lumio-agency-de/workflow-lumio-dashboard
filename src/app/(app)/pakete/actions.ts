"use server";

// Server-Funktionen zum Verwalten der Pakete (laufen nur auf dem Server).
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// Sicherheitscheck: nur eingeloggte Nutzer duerfen Aenderungen vornehmen
async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
}

// Einen Euro-Betrag aus dem Formular robust in eine Zahl wandeln ("1.234,50" -> 1234.5)
function parsePrice(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "")
    .replace(/\./g, "") // Tausenderpunkte entfernen
    .replace(",", ".") // Komma zu Punkt
    .trim();
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 0 : n;
}

// Neues Paket anlegen
export async function createPackage(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return; // ohne Namen nichts anlegen

  await prisma.package.create({
    data: {
      name,
      description: String(formData.get("description") ?? "").trim(),
      defaultPrice: parsePrice(formData.get("defaultPrice")),
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/pakete"); // Liste neu laden
  revalidatePath("/angebote"); // Pakete-Tab in den Angeboten aktualisieren
}

// Bestehendes Paket bearbeiten
export async function updatePackage(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.package.update({
    where: { id },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      defaultPrice: parsePrice(formData.get("defaultPrice")),
      active: formData.get("active") === "on",
    },
  });

  revalidatePath("/pakete");
  revalidatePath("/angebote");
}

// Paket loeschen (bereits erstellte Angebote bleiben unveraendert,
// da deren Positionen als Kopie gespeichert sind)
export async function deletePackage(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.package.delete({ where: { id } });
  revalidatePath("/pakete");
  revalidatePath("/angebote");
}
