"use server";

// Termine im Google-Kalender anlegen/bearbeiten/loeschen (nur wenn ein Konto verbunden ist).
import { auth } from "@/auth";
import { revalidatePath, updateTag } from "next/cache";
import {
  getGoogleClientForAccount,
  getPrimaryAccountId,
} from "@/lib/google/client";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar";
import { berlinTimeToUtc } from "@/lib/timezone";

// Client fuer EIN konkretes Konto (GoogleAccount.id). Der Zwischenspeicher
// (siehe dashboard-data.ts) wird pro Konto gefuehrt, daher geben wir die
// Konto-ID zurueck, um danach gezielt `calendar-<accountId>` zu leeren.
async function requireClientForAccount(accountId: string) {
  const client = await getGoogleClientForAccount(accountId);
  if (!client) throw new Error("Kein Google-Konto verbunden");
  return { client, accountId };
}

// Loest ein Konto aus den Formulardaten auf: bevorzugt die direkt uebergebene
// Konto-ID (ownerAccountId beim Bearbeiten/Loeschen), sonst das primaere Konto
// des gewaehlten Nutzers (calendarUserId beim Anlegen), sonst das primaere
// Konto des eingeloggten Nutzers.
async function resolveAccountId(
  explicitAccountId: string,
  fallbackUserId: string
): Promise<string> {
  // IMMER zuerst die Anmeldung pruefen. Server-Actions sind offene
  // POST-Endpunkte: ohne diesen Check koennte ein Unangemeldeter durch Angabe
  // einer beliebigen ownerAccountId fremde Google-Kalender manipulieren.
  const session = await auth();
  if (!session?.user?.id) throw new Error("Nicht angemeldet");
  if (explicitAccountId) return explicitAccountId;
  const userId = fallbackUserId || session.user.id;
  const accountId = await getPrimaryAccountId(userId);
  if (!accountId) throw new Error("Kein Google-Konto verbunden");
  return accountId;
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
  const accountId = await resolveAccountId("", calendarUserId);
  const { client } = await requireClientForAccount(accountId);

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

  updateTag(`calendar-${accountId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function updateEvent(formData: FormData) {
  const ownerAccountId = String(formData.get("ownerAccountId") ?? "");
  const ownerUserId = String(formData.get("ownerUserId") ?? "");
  const accountId = await resolveAccountId(ownerAccountId, ownerUserId);
  const { client } = await requireClientForAccount(accountId);

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

  updateTag(`calendar-${accountId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const ownerAccountId = String(formData.get("ownerAccountId") ?? "");
  const ownerUserId = String(formData.get("ownerUserId") ?? "");
  const accountId = await resolveAccountId(ownerAccountId, ownerUserId);
  const { client } = await requireClientForAccount(accountId);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteCalendarEvent(client, id);

  updateTag(`calendar-${accountId}`);
  revalidatePath("/kalender");
  revalidatePath("/");
}
