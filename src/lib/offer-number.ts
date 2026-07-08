// Erzeugt die naechste fortlaufende Angebotsnummer, z. B. "ANG-2026-001".
import { prisma } from "@/lib/prisma";

export async function generateOfferNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ANG-${year}-`;

  // Hoechste bisherige Nummer dieses Jahres suchen
  const last = await prisma.offer.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });

  let next = 1;
  if (last) {
    // Den Zaehlerteil hinter dem Prefix auslesen und um 1 erhoehen
    const current = parseInt(last.number.slice(prefix.length), 10);
    if (!Number.isNaN(current)) next = current + 1;
  }

  // Auf 3 Stellen mit fuehrenden Nullen auffuellen
  return prefix + String(next).padStart(3, "0");
}
