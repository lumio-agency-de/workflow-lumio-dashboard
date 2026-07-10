// Fallback-Ansicht, wenn eine Datenbank-Tabelle (noch) nicht existiert — z. B.
// bevor die Supabase-Migration gelaufen ist. Verhindert eine 500-Fehlerseite:
// die Seite zeigt stattdessen einen ruhigen Hinweis und lebt weiter.
import { Database } from "lucide-react";
import { PageHeader } from "@/components/panel";
import { Reveal } from "@/components/reveal";

// Prisma wirft P2021, wenn eine Tabelle fehlt, und P2022, wenn eine Spalte fehlt.
// Genau diese Fälle fangen wir ab (Migration steht noch aus); alle anderen Fehler
// (echte Bugs) werden bewusst NICHT geschluckt, sondern weitergereicht.
export function isMissingTableError(e: unknown): boolean {
  if (typeof e !== "object" || e === null || !("code" in e)) return false;
  const code = (e as { code?: unknown }).code;
  return code === "P2021" || code === "P2022";
}

export function DbUnavailable({ titel }: { titel: string }) {
  return (
    <div>
      <Reveal>
        <PageHeader title={titel} subtitle="Wird gerade eingerichtet" />
      </Reveal>
      <Reveal delay={0.05}>
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <Database className="h-8 w-8 text-muted" />
          <p className="max-w-md text-sm text-muted">
            Diese Funktion wird gerade eingerichtet — die zugehörige Datenbank-Tabelle
            ist noch nicht angelegt. Sobald die Migration in Supabase gelaufen ist,
            erscheinen hier automatisch die Daten.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
