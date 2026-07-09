"use server";

// Termine im Google-Kalender anlegen/bearbeiten/loeschen (nur wenn ein Konto verbunden ist).
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getGoogleClientForUser } from "@/lib/google/client";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";

async function requireClient() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  const client = await getGoogleClientForUser(session.user.id);
  // Ohne verbundenes Konto kann kein echter Termin bearbeitet werden
  if (!client) throw new Error("Kein Google-Konto verbunden");
  return client;
}

export async function createEvent(formData: FormData) {
  const client = await requireClient();

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const location = String(formData.get("location") ?? "").trim();
  if (!title || !date) return;

  // Datum + Uhrzeit zu vollstaendigen Zeitpunkten zusammensetzen
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);

  await createCalendarEvent(client, {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    location: location || undefined,
  });

  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function updateEvent(formData: FormData) {
  const client = await requireClient();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const location = String(formData.get("location") ?? "").trim();
  if (!id || !title || !date) return;

  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);

  await updateCalendarEvent(client, id, {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    location: location || undefined,
  });

  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const client = await requireClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteCalendarEvent(client, id);

  revalidatePath("/kalender");
  revalidatePath("/");
}
