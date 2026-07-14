"use server";

// Server-Funktionen fuer den Bereich "Leads" (Akquise):
//  - createSearchRequest: legt einen Such-Auftrag an (Status "angefragt").
//    Der leadgen-Runner (Mac/VPS) pollt die Tabelle, fuehrt die Suche aus und
//    spuelt die Prospects ein – Vercel selbst fuehrt NICHTS aus.
//  - updateProspect: pflegt die manuellen CRM-Felder (abhaken, Status, Notiz).
//    Genau diese Felder ruehrt der leadgen-Sync nie an.
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

export async function createSearchRequest(formData: FormData) {
  const user = await requireUser();

  const branche = String(formData.get("branche") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  if (!branche || !location) return;

  const radiusKm = Number(formData.get("radius_km")) || 15;
  const limit = Number(formData.get("limit")) || 30;
  const quellen = formData.getAll("quellen").map(String).filter(Boolean);

  await prisma.searchRequest.create({
    data: {
      branche,
      location,
      radiusKm,
      limit,
      quellen: (quellen.length ? quellen : ["gelbeseiten", "google"]).join(","),
      mitScreenshot: formData.get("mit_screenshot") === "on",
      mitKi: formData.get("mit_ki") === "on",
      verifyWebsites: formData.get("verify_websites") === "on",
      requestedBy: user.username ?? user.name ?? "",
    },
  });

  revalidatePath("/leads");
}

// Abhaken / Status setzen. `field` entscheidet, was gesetzt wird — bewusst
// eng gehalten (nur die manuellen CRM-Felder), damit von der UI nichts an den
// Auto-Feldern (Score, Website …) manipuliert werden kann.
export async function updateProspect(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const data: Record<string, unknown> = {};

  const status = formData.get("status");
  if (status != null) {
    data.status = String(status);
    // Beim ersten Wechsel weg von "neu" das Kontaktdatum stempeln, falls leer.
    if (String(status) !== "neu") {
      const p = await prisma.prospect.findUnique({ where: { id }, select: { kontaktiertAm: true } });
      if (p && !p.kontaktiertAm) data.kontaktiertAm = new Date();
    }
  }

  if (formData.has("kontaktiert")) {
    // Checkbox-Toggle: an -> kontaktiert (Datum stempeln), aus -> zurueck auf neu.
    const an = formData.get("kontaktiert") === "true";
    data.status = an ? "kontaktiert" : "neu";
    data.kontaktiertAm = an ? new Date() : null;
  }

  const notiz = formData.get("notiz");
  if (notiz != null) data.notiz = String(notiz);

  const reaktion = formData.get("reaktion");
  if (reaktion != null) data.reaktion = String(reaktion);

  const ansprechpartner = formData.get("ansprechpartner");
  if (ansprechpartner != null) data.ansprechpartner = String(ansprechpartner);

  // Wiedervorlage setzen/loeschen (z. B. aus dem KI-Follow-up-Vorschlag).
  const wiedervorlage = formData.get("wiedervorlage");
  if (wiedervorlage != null) {
    const s = String(wiedervorlage).trim();
    const d = s ? new Date(s) : null;
    data.wiedervorlage = d && !Number.isNaN(d.getTime()) ? d : null;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.prospect.update({ where: { id }, data });
  revalidatePath("/leads");
}

// Lead endgueltig loeschen: entfernt den Prospect (und eine evtl. verknuepfte
// Kontakt-Vorbereitung) komplett aus dem Dashboard. Nicht rueckgaengig zu machen
// — der leadgen-Sync koennte die Firma bei einem neuen Lauf aber wieder anlegen.
export async function deleteProspect(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Erst eine evtl. vorhandene Vorbereitung entfernen (sonst bliebe sie verwaist),
  // dann den Prospect selbst.
  await prisma.contactPrep.deleteMany({ where: { prospectId: id } });
  await prisma.prospect.delete({ where: { id } }).catch(() => {});
  revalidatePath("/leads");
  revalidatePath("/kontakt-vorbereitung");
  revalidatePath("/kontaktiert");
}
