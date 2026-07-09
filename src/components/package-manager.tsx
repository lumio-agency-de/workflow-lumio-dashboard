// Wiederverwendbare Paketverwaltung: Liste aller Pakete + Formulare zum Anlegen/Bearbeiten/Loeschen.
// Server-Komponente, laedt die Pakete selbst und nutzt die vorhandenen Server Actions.
import { Package as PackageIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/panel";
import { Reveal } from "@/components/reveal";
import { createPackage, updatePackage, deletePackage } from "@/app/(app)/pakete/actions";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export async function PackageManager() {
  const packages = await prisma.package.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      {/* Neues Paket anlegen */}
      <Reveal delay={0.05}>
        <Panel className="mb-8 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <PackageIcon className="h-[18px] w-[18px] text-accent" />
            Neues Paket anlegen
          </h2>
          <form action={createPackage} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
              <input name="name" placeholder="Name (z. B. Landingpage)" required className={inputClass} />
              <input name="defaultPrice" inputMode="decimal" placeholder="Preis netto (z. B. 490)" className={inputClass} />
            </div>
            <input name="description" placeholder="Kurzbeschreibung (optional)" className={inputClass} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked className="accent-[var(--color-accent)]" /> Aktiv (im
              Angebotsformular auswählbar)
            </label>
            <button
              type="submit"
              className="glow-accent self-start rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
            >
              Paket anlegen
            </button>
          </form>
        </Panel>
      </Reveal>

      {/* Vorhandene Pakete */}
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold">Vorhandene Pakete ({packages.length})</h2>

        {packages.length === 0 && (
          <p className="text-sm text-muted">Noch keine Pakete vorhanden.</p>
        )}

        {packages.map((p, i) => (
          <Reveal key={p.id} delay={0.05 + i * 0.03}>
            <Panel className="p-5">
              <form action={updatePackage} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                  <input name="name" defaultValue={p.name} required className={inputClass} />
                  <input name="defaultPrice" inputMode="decimal" defaultValue={p.defaultPrice} className={inputClass} />
                </div>
                <input name="description" defaultValue={p.description} placeholder="Kurzbeschreibung (optional)" className={inputClass} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={p.active} className="accent-[var(--color-accent)]" /> Aktiv
                </label>
                <button
                  type="submit"
                  className="self-start rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
                >
                  Speichern
                </button>
              </form>

              <form action={deletePackage} className="mt-2">
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-rose-400 transition-colors hover:text-rose-300"
                >
                  Löschen
                </button>
              </form>
            </Panel>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
