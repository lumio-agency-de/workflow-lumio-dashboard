"use server";

// Server-Funktionen fuer die Nutzer-Einstellungen (Profil + verbundene Konten).
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Anzeigenamen des angemeldeten Nutzers aendern.
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  // Das Layout liest den Namen frisch aus der DB – neu laden lassen.
  revalidatePath("/", "layout");
}

// Ein verbundenes Google-Konto des Nutzers trennen (Tokens loeschen).
// Es werden nur EIGENE Konten getrennt (userId-Abgleich), nie fremde.
export async function disconnectGoogleAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return;

  await prisma.googleAccount.deleteMany({
    where: { id: accountId, userId: session.user.id },
  });

  revalidatePath("/kalender");
  revalidatePath("/mails");
  revalidatePath("/", "layout");
}
