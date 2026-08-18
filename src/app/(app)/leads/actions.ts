"use server";

// Server-Funktionen fuer den Bereich "Leads" (Akquise):
//  - createSearchRequest: legt einen Such-Auftrag an (Status "angefragt").
//    Der leadgen-Runner (Mac/VPS) pollt die Tabelle, fuehrt die Suche aus und
//    spuelt die Prospects ein – Vercel selbst fuehrt NICHTS aus.
//  - updateProspectTrack: pflegt die manuellen CRM-Felder JE SPUR
//    (Website / Anzeigen). Der leadgen-Sync ruehrt diese Tabelle nie an.
//  - updateAdsBewertung: die Anzeigen-spezifischen Felder am Prospect
//    (Mitarbeiterzahl, Werbebibliothek, Kapazitaetsnotiz).
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { spurAusParam } from "@/lib/spur";

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

// Abhaken / Status setzen — immer fuer EINE Spur. Bewusst eng gehalten (nur
// manuelle CRM-Felder), damit von der UI nichts an den Auto-Feldern (Score,
// Website …) manipuliert werden kann.
//
// Die Zeile in ProspectTrack wird bei Bedarf angelegt: Firmen, die frisch aus
// dem leadgen kommen, haben noch keine — sie gelten dann als "neu".
export async function updateProspectTrack(formData: FormData) {
  await requireUser();
  const prospectId = String(formData.get("id") ?? "");
  if (!prospectId) return;
  const spur = spurAusParam(String(formData.get("spur") ?? ""));

  const data: Record<string, unknown> = {};

  const status = formData.get("status");
  if (status != null) data.status = String(status);

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

  // Beim ersten Wechsel weg von "neu" das Kontaktdatum stempeln, falls leer.
  if (typeof data.status === "string" && data.status !== "neu" && !("kontaktiertAm" in data)) {
    const vorher = await prisma.prospectTrack.findUnique({
      where: { prospectId_spur: { prospectId, spur } },
      select: { kontaktiertAm: true },
    });
    if (!vorher?.kontaktiertAm) data.kontaktiertAm = new Date();
  }

  await prisma.prospectTrack.upsert({
    where: { prospectId_spur: { prospectId, spur } },
    create: { prospectId, spur, ...data },
    update: data,
  });

  revalidatePath("/leads");
}

// Anzeigen-Bewertung am Prospect: Mitarbeiterzahl, Werbebibliothek-Befund und
// die Kapazitaetsnotiz aus dem Telefonat. An diesen Feldern haengt der vierte
// Qualifizierungsfilter (freie Kapazitaet x Deckungsbeitrag).
export async function updateAdsBewertung(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const data: Record<string, unknown> = {};

  const mitarbeiter = formData.get("mitarbeiter");
  if (mitarbeiter != null) {
    const s = String(mitarbeiter).trim();
    if (s === "") {
      data.mitarbeiter = null;
    } else {
      const n = Number.parseInt(s, 10);
      if (Number.isFinite(n) && n >= 0 && n < 10000) data.mitarbeiter = n;
    }
  }

  const schaltet = formData.get("schaltetAnzeigen");
  if (schaltet != null) {
    const s = String(schaltet);
    if (s === "ja" || s === "nein" || s === "unbekannt") {
      data.schaltetAnzeigen = s;
      // "geprueft am" nur stempeln, wenn tatsaechlich nachgesehen wurde.
      data.anzeigenGeprueftAm = s === "unbekannt" ? null : new Date();
    }
  }

  const kapazitaetNotiz = formData.get("kapazitaetNotiz");
  if (kapazitaetNotiz != null) data.kapazitaetNotiz = String(kapazitaetNotiz);

  if (Object.keys(data).length === 0) return;

  await prisma.prospect.update({ where: { id }, data });
  revalidatePath("/leads");
}

// Lead endgueltig loeschen: entfernt den Prospect (und eine evtl. verknuepfte
// Kontakt-Vorbereitung sowie alle Spuren) komplett aus dem Dashboard. Nicht
// rueckgaengig zu machen — der leadgen-Sync koennte die Firma bei einem neuen
// Lauf aber wieder anlegen.
export async function deleteProspect(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Erst eine evtl. vorhandene Vorbereitung entfernen (sonst bliebe sie verwaist),
  // dann den Prospect selbst. Die Spuren gehen per Cascade mit.
  await prisma.contactPrep.deleteMany({ where: { prospectId: id } });
  await prisma.prospect.delete({ where: { id } }).catch(() => {});
  revalidatePath("/leads");
  revalidatePath("/kontakt-vorbereitung");
  revalidatePath("/kontaktiert");
}
