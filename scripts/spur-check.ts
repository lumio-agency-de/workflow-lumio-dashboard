// Kontrolle nach der Spur-Migration (lesend):
// Sind die bestehenden Leads in der Spur "website" angekommen?
//
// Aufruf:  npx tsx scripts/spur-check.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const prospects = await prisma.prospect.count();
  const tracks = await prisma.prospectTrack.count();

  const gruppen = await prisma.prospectTrack.groupBy({
    by: ["spur", "status"],
    _count: { _all: true },
    orderBy: [{ spur: "asc" }, { status: "asc" }],
  });

  console.log(`\nProspects gesamt: ${prospects}`);
  console.log(`Spur-Zeilen gesamt: ${tracks}\n`);
  console.log("Spur       Status            Anzahl");
  console.log("--------------------------------------");
  for (const g of gruppen) {
    console.log(
      `${g.spur.padEnd(10)} ${g.status.padEnd(17)} ${String(g._count._all).padStart(6)}`,
    );
  }

  const ohne = await prisma.prospect.count({
    where: { tracks: { none: { spur: "website" } } },
  });
  console.log(`\nOhne Website-Spur (gelten als "neu"): ${ohne}`);

  // Was die Anzeigen-Spur aktuell zeigt.
  const ads = await prisma.prospect.count({ where: { branche: "heizung-sanitaer" } });
  console.log(`Firmen in der Anzeigen-Spur (heizung-sanitaer): ${ads}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
