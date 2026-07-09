// Zentraler Datenbank-Zugang (Prisma-Client).
// Wird ueberall im Tool importiert, damit es nur EINE Verbindung gibt.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adapter, der Prisma mit der Postgres-Datenbank (Supabase) verbindet
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Im Entwicklungsmodus den Client global zwischenspeichern,
// damit bei jedem Code-Reload nicht eine neue Verbindung entsteht.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
