// Seed-Skript: legt die zwei festen Login-Konten und ein paar Beispiel-Pakete an.
// Ausfuehren mit:  npm run db:seed
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Eigene DB-Verbindung fuer das Skript
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Login-Konten ---------------------------------------------------------
  // Start-Passwoerter koennen ueber Umgebungsvariablen gesetzt werden,
  // sonst werden die Standardwerte unten benutzt. NACH dem ersten Login aendern!
  const mikoPassword = process.env.SEED_MIKO_PASSWORD ?? "lumio-miko-2026";
  const nevioPassword = process.env.SEED_NEVIO_PASSWORD ?? "lumio-nevio-2026";
  const infoPassword = process.env.SEED_INFO_PASSWORD ?? "lumio-info-2026";

  // upsert = anlegen falls nicht vorhanden, sonst nichts ueberschreiben
  await prisma.user.upsert({
    where: { username: "miko" },
    update: {},
    create: {
      username: "miko",
      name: "Miko Brüll",
      passwordHash: await bcrypt.hash(mikoPassword, 10), // Passwort sicher hashen
    },
  });

  await prisma.user.upsert({
    where: { username: "nevio" },
    update: {},
    create: {
      username: "nevio",
      name: "Nevio Liebig",
      passwordHash: await bcrypt.hash(nevioPassword, 10),
    },
  });

  // Gemeinsamer Zugang fuers Team-Postfach (info@lumio-agency.de)
  await prisma.user.upsert({
    where: { username: "info" },
    update: {},
    create: {
      username: "info",
      name: "Info (Team-Postfach)",
      passwordHash: await bcrypt.hash(infoPassword, 10),
    },
  });

  // --- Beispiel-Pakete (Platzhalter) ---------------------------------------
  // ACHTUNG: Preise sind Beispielwerte. Echte Pakete/Preise im Tool unter
  // "Pakete" selbst anlegen oder bearbeiten.
  const packages = [
    {
      name: "Landingpage (1 Seite, ohne Zusatzfunktion)",
      description: "Einseitige Website ohne Sonderfunktionen.",
      defaultPrice: 490,
      sortOrder: 1,
    },
    {
      name: "Website mit Terminvereinbarungs-Funktion",
      description: "Website inkl. Online-Terminbuchung.",
      defaultPrice: 890,
      sortOrder: 2,
    },
    {
      name: "Website mit Shop-Funktion",
      description: "Website inkl. einfachem Online-Shop.",
      defaultPrice: 1490,
      sortOrder: 3,
    },
    {
      name: "Zusatzposition: weitere Unterseite",
      description: "Je zusaetzliche Unterseite.",
      defaultPrice: 90,
      sortOrder: 4,
    },
  ];

  // Nur anlegen, wenn noch gar keine Pakete existieren (damit nichts doppelt entsteht)
  const existing = await prisma.package.count();
  if (existing === 0) {
    for (const p of packages) {
      await prisma.package.create({ data: p });
    }
  }

  console.log("Seed fertig: Konten 'miko' und 'nevio' + Beispiel-Pakete angelegt.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
