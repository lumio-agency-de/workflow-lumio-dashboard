"use client";

// Tab-Umschaltung zwischen "Angebote" und "Pakete".
// Beide Inhalte werden als children uebergeben und nur per hidden-Attribut
// aus-/eingeblendet, damit die Server-Komponenten nicht neu gemountet werden.
import { useState, type ReactNode } from "react";

type TabKey = "angebote" | "pakete";

export default function AngeboteTabs({
  angebote,
  pakete,
}: {
  angebote: ReactNode;
  pakete: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("angebote");

  const chip = (tab: TabKey) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active === tab
        ? "border-accent/40 bg-accent/15 text-accent"
        : "border-line bg-white/5 text-muted hover:text-ink"
    }`;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <button type="button" onClick={() => setActive("angebote")} className={chip("angebote")}>
          Angebote
        </button>
        <button type="button" onClick={() => setActive("pakete")} className={chip("pakete")}>
          Pakete
        </button>
      </div>

      <div hidden={active !== "angebote"}>{angebote}</div>
      <div hidden={active !== "pakete"}>{pakete}</div>
    </div>
  );
}
