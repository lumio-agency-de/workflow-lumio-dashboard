// Zentraler Datenbank-Zugang (Prisma-Client).
// Wird ueberall im Tool importiert, damit es nur EINE Verbindung gibt.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Adapter, der Prisma mit der lokalen SQLite-Datei verbindet
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

// Im Entwicklungsmodus den Client global zwischenspeichern,
// damit bei jedem Code-Reload nicht eine neue Verbindung entsteht.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
