"use server";

// Termine im Google-Kalender anlegen/bearbeiten/loeschen (nur wenn ein Konto verbunden ist).
import { auth } from "@/auth";
import { revalidatePath, updateTag } from "next/cache";
import { getGoogleClientForUser } from "@/lib/google/client";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";
import { berlinTimeToUtc } from "@/lib/timezone";

// Client fuer ein bestimmtes Konto (Kalender-Auswahl bzw. Termin-Besitzer),
// faellt auf den eingeloggten Nutzer zurueck, wenn keins angegeben ist.
// Gibt auch die aufgeloeste Nutzer-ID zurueck, um danach gezielt den
// Zwischenspeicher (siehe dashboard-data.ts) fuer genau dieses Konto zu leeren.
async function requireClient(targetUserId?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  const userId = targetUserId || session.user.id;
  const client = await getGoogleClientForUser(userId);
  // Ohne verbundenes Konto kann kein echter Termin bearbeitet werden
  if (!client) throw new Error("Kein Google-Konto verbunden");
  return { client, userId };
}

// Start/Ende aus Datum + Uhrzeit bilden. Google lehnt Termine mit Ende <= Start
// ab ("The specified time range is empty") – das faengt hier ab statt die
// Seite abstuerzen zu lassen.
function resolveRange(date: string, startTime: string, endTime: string) {
  const start = berlinTimeToUtc(date, startTime);
  let end = berlinTimeToUtc(date, endTime);
  if (end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + 60 * 60000); // 1 Stunde spaeter
  }
  return { start, end };
}

export async function createEvent(formData: FormData) {
  const calendarUserId = String(formData.get("calendarUserId") ?? "");
  const { client, userId } = await requireClient(calendarUserId);

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const location = String(formData.get("location") ?? "").trim();
  if (!title || !date) return;

  const { start, end } = resolveRange(date, startTime, endTime);

  await createCalendarEvent(client, {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    location: location || undefined,
  });

  updateTag(`calendar-${userId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function updateEvent(formData: FormData) {
  const ownerUserId = String(formData.get("ownerUserId") ?? "");
  const { client, userId } = await requireClient(ownerUserId);

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "09:00");
  const endTime = String(formData.get("endTime") ?? "10:00");
  const location = String(formData.get("location") ?? "").trim();
  if (!id || !title || !date) return;

  const { start, end } = resolveRange(date, startTime, endTime);

  await updateCalendarEvent(client, id, {
    title,
    start: start.toISOString(),
    end: end.toISOString(),
    location: location || undefined,
  });

  updateTag(`calendar-${userId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const ownerUserId = String(formData.get("ownerUserId") ?? "");
  const { client, userId } = await requireClient(ownerUserId);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteCalendarEvent(client, id);

  updateTag(`calendar-${userId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}
