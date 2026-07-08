"use server";

// Termin im Google-Kalender anlegen (nur wenn ein Konto verbunden ist).
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getGoogleClientForUser } from "@/lib/google/client";
import { createCalendarEvent } from "@/lib/google/calendar";

export async function createEvent(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");

  const client = await getGoogleClientForUser(session.user.id);
  // Ohne verbundenes Konto kann kein echter Termin angelegt werden
  if (!client) throw new Error("Kein Google-Konto verbunden");

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  if (!title || !date) return;

  // Datum + Uhrzeit zu vollstaendigen Zeitpunkten zusammensetzen
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);

  await createCalendarEvent(client, {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  revalidatePath("/kalender");
  revalidatePath("/");
}
