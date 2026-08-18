// Einmal-Check (lesend): Wie verteilen sich die Prospects auf die Branchen?
// Beantwortet die Frage, ob die Anzeigen-Spur (nur "heizung-sanitaer")
// ueberhaupt Firmen findet oder ob die SHK-Betriebe in der Sammelbranche
// "handwerk" stecken.
//
// Aufruf:  npx tsx scripts/branchen-check.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const gruppen = await prisma.prospect.groupBy({
    by: ["branche"],
    _count: { _all: true },
    orderBy: { _count: { branche: "desc" } },
  });

  console.log("\nProspects je Branche:");
  for (const g of gruppen) {
    console.log(`  ${String(g._count._all).padStart(5)}  ${g.branche || "(leer)"}`);
  }

  // Wie viele davon sehen dem Namen nach nach SHK aus, stecken aber in einer
  // anderen Branche? Das waere der Kandidatenpool fuer eine Umsortierung.
  const shkWoerter = ["sanit", "heiz", "shk", "bad", "haustechnik", "installat", "klempner"];
  const alle = await prisma.prospect.findMany({ select: { name: true, branche: true } });
  const treffer = alle.filter(
    (p) =>
      p.branche !== "heizung-sanitaer" &&
      shkWoerter.some((w) => p.name.toLowerCase().includes(w)),
  );

  console.log(`\nName sieht nach SHK aus, Branche ist aber eine andere: ${treffer.length}`);
  const nachBranche: Record<string, number> = {};
  for (const t of treffer) nachBranche[t.branche] = (nachBranche[t.branche] ?? 0) + 1;
  for (const [b, n] of Object.entries(nachBranche).sort((a, z) => z[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${b || "(leer)"}`);
  }
  console.log("\nBeispiele:", treffer.slice(0, 8).map((t) => t.name).join(" · "));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
