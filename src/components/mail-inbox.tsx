"use client";

// Posteingang mit Kategorie-Filter und KI-Antwortvorschlaegen.
import { useMemo, useState } from "react";
import { Sparkles, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import type { MailItem, MailCategory } from "@/lib/types";
import { CategoryBadge } from "@/components/badges";
import { formatDayShort } from "@/lib/format";
import { colorForUsername } from "@/lib/team";

const CATEGORIES: MailCategory[] = [
  "Anfrage",
  "Rechnung",
  "Support",
  "Newsletter",
  "Sonstiges",
];

export default function MailInbox({
  mails,
  connected,
}: {
  mails: MailItem[];
  connected: boolean;
}) {
  const [filter, setFilter] = useState<MailCategory | "Alle">("Alle");
  const [selectedId, setSelectedId] = useState<string | null>(mails[0]?.id ?? null);

  // KI-Vorschlag-Status
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gefilterte Liste
  const filtered = useMemo(
    () => (filter === "Alle" ? mails : mails.filter((m) => m.category === filter)),
    [mails, filter]
  );
  const selected = mails.find((m) => m.id === selectedId) ?? null;

  // Anzahl je Kategorie (fuer die Filter-Chips)
  const counts = useMemo(() => {
    const c: Record<string, number> = { Alle: mails.length };
    for (const cat of CATEGORIES) c[cat] = mails.filter((m) => m.category === cat).length;
    return c;
  }, [mails]);

  // KI-Antwortvorschlag anfordern
  async function suggest() {
    if (!selected) return;
    setLoading(true);
    setDraft("");
    setCopied(false);
    try {
      const res = await fetch("/api/mails/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selected.subject,
          fromName: selected.fromName,
          snippet: selected.snippet,
          category: selected.category,
        }),
      });
      const data = await res.json();
      setDraft(data.suggestion ?? "");
    } catch {
      setDraft("Vorschlag konnte nicht erstellt werden.");
    } finally {
      setLoading(false);
    }
  }

  // Entwurf in die Zwischenablage kopieren
  async function copyDraft() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      {/* Kategorie-Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["Alle", ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (filter === cat
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-line bg-white/5 text-muted hover:text-ink")
            }
          >
            {cat}{" "}
            <span className="opacity-60">{counts[cat] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Liste */}
        <div className="glass max-h-[70vh] overflow-y-auto rounded-2xl">
          <ul className="divide-y divide-[var(--color-line)]">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setSelectedId(m.id);
                    setDraft("");
                  }}
                  className={
                    "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-white/5 " +
                    (selectedId === m.id ? "bg-white/5" : "")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {m.ownerUsername && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: colorForUsername(m.ownerUsername) }}
                          title={m.ownerName ?? m.ownerUsername}
                        />
                      )}
                      <span
                        className={
                          "truncate text-sm " +
                          (m.unread ? "font-semibold text-ink" : "text-muted")
                        }
                      >
                        {m.fromName}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDayShort(m.date)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted">{m.subject}</span>
                    <CategoryBadge category={m.category} />
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Keine E-Mails in dieser Kategorie.
              </li>
            )}
          </ul>
        </div>

        {/* Detail + KI-Antwort */}
        <div className="glass rounded-2xl p-5">
          {!selected ? (
            <p className="text-sm text-muted">Wähle links eine E-Mail aus.</p>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold leading-snug">
                    {selected.subject}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.fromName} · {selected.fromEmail}
                  </p>
                  {selected.ownerEmail && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: colorForUsername(selected.ownerUsername ?? ""),
                        }}
                      />
                      eingegangen bei {selected.ownerEmail}
                    </p>
                  )}
                </div>
                <CategoryBadge category={selected.category} />
              </div>

              <p className="mt-4 rounded-xl border border-line bg-white/5 p-3 text-sm text-muted">
                {selected.snippet}
              </p>

              {/* KI-Antwort */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-accent" />
                    KI-Antwortvorschlag
                  </h3>
                  <button
                    onClick={suggest}
                    disabled={loading}
                    className="glow-accent flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {draft ? "Neu erstellen" : "Vorschlag erstellen"}
                  </button>
                </div>

                {(draft || loading) && (
                  <div className="mt-3">
                    <textarea
                      value={loading ? "" : draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={loading ? "KI schreibt einen Entwurf …" : ""}
                      className="min-h-52 w-full rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={copyDraft}
                        disabled={!draft}
                        className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" /> Kopiert
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Entwurf kopieren
                          </>
                        )}
                      </button>
                      {connected && (
                        <a
                          href={`https://mail.google.com/mail/u/0/#inbox/${selected.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> In Gmail öffnen
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
