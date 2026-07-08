"use server";

// Abmelde-Aktion (Server-Funktion), damit sie auch aus Client-Komponenten
// wie der Seitenleiste aufgerufen werden kann.
import { signOut } from "@/auth";

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
