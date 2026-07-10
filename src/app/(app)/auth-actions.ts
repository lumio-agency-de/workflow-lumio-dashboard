"use server";

// Abmelde-Aktion (Server-Funktion), damit sie auch aus Client-Komponenten
// wie der Seitenleiste aufgerufen werden kann.
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkPassword } from "@/lib/password";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

// Rueckgabewert der Passwort-Aenderung – bewusst serialisierbar, damit das
// Client-Formular Erfolg bzw. Fehlermeldung direkt anzeigen kann.
export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

// Setzt ein neues Passwort fuer den aktuell angemeldeten Nutzer.
export async function changePassword(
  formData: FormData,
): Promise<ChangePasswordResult> {
  // Aktuelle Session lesen – ohne gueltigen Login kein Wechsel.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "Nicht angemeldet. Bitte neu einloggen." };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Beide Felder muessen uebereinstimmen.
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "Die beiden Passwörter stimmen nicht überein." };
  }

  // Finale Regel-Pruefung auch serverseitig (nicht nur im Browser).
  if (!checkPassword(newPassword).ok) {
    return {
      ok: false,
      error: "Das Passwort erfüllt nicht alle Sicherheitskriterien.",
    };
  }

  // Neuen bcrypt-Hash erzeugen und Nutzer aktualisieren.
  const passwordHash = await bcrypt.hash(newPassword, 12);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
  } catch {
    return {
      ok: false,
      error: "Das Passwort konnte nicht gespeichert werden. Bitte erneut versuchen.",
    };
  }

  return { ok: true };
}
