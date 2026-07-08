"use client";

// Editor fuer das Telefon-Skript mit Speicher-Bestaetigung.
import { useState, useTransition } from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { savePhoneScript } from "./actions";

export default function ScriptEditor({ initial }: { initial: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          await savePhoneScript(fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
    >
      <textarea
        name="script"
        defaultValue={initial}
        spellCheck={false}
        className="min-h-[32rem] w-full rounded-xl border border-line bg-white/5 p-4 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-accent"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Gespeichert" : "Skript speichern"}
        </button>
        <span className="text-xs text-muted">
          Änderungen gelten für beide Nutzer.
        </span>
      </div>
    </form>
  );
}
