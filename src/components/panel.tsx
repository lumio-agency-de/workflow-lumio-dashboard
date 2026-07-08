// Praesentations-Bausteine (ohne Interaktivitaet) fuer das Dashboard.
import type { LucideIcon } from "lucide-react";
import { formatEuro } from "@/lib/format";

// Glas-Panel als Grundflaeche
export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"glass rounded-2xl " + className}>{children}</div>
  );
}

// Seitenkopf mit Titel, Untertitel und optionaler Aktion (z. B. Button)
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-gradient">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Kennzahl-Karte fuer die Uebersicht
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-accent/10 text-accent">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Panel>
  );
}

// Kleiner Helfer, um Euro-Betraege anzuzeigen (re-export fuer Bequemlichkeit)
export { formatEuro };
