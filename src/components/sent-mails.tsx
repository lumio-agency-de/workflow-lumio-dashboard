"use client";

// Postausgang: gesendete (ausgehende) Mails mit Empfaenger, Betreff und
// Volltext – damit man den Inhalt direkt im Dashboard liest, ohne Google
// Workspace zu oeffnen. Postfach-Filter wie im Posteingang (Alle / Info / eigen).
import { useMemo, useState } from "react";
import { ExternalLink, Send } from "lucide-react";
import type { SentMailItem } from "@/lib/types";
import { formatDayShort, formatDate, formatTime } from "@/lib/format";
import { colorForUsername } from "@/lib/team";

type Account = { userId: string; username: string; name: string; connected: boolean };
type Mailbox = "Alle" | string;

export default function SentMails({
  mails,
  connected,
  ownUsername = "",
  userName = "",
  accounts,
}: {
  mails: SentMailItem[];
  connected: boolean;
  ownUsername?: string;
  userName?: string;
  accounts?: Account[];
}) {
  const [mailbox, setMailbox] = useState<Mailbox>("Alle");
  const [selectedId, setSelectedId] = useState<string | null>(mails[0]?.id ?? null);

  // Verfuegbare Postfaecher: "Alle", "Info" und das persoenliche Postfach
  const mailboxes = useMemo(() => {
    const list: { key: Mailbox; label: string; username: string }[] = [
      { key: "Alle", label: "Alle", username: "" },
      { key: "info", label: "Info", username: "info" },
    ];
    if (ownUsername && ownUsername !== "info") {
      const own = accounts?.find((a) => a.username === ownUsername);
      list.push({
        key: ownUsername,
        label: own?.name || userName || ownUsername,
        username: ownUsername,
      });
    }
    return list;
  }, [ownUsername, userName, accounts]);

  const filtered = useMemo(
    () =>
      mails.filter((m) => mailbox === "Alle" || m.ownerUsername === mailbox),
    [mails, mailbox]
  );
  const selected = mails.find((m) => m.id === selectedId) ?? null;

  const mailboxCounts = useMemo(() => {
    const c: Record<string, number> = { Alle: mails.length };
    for (const mb of mailboxes) {
      if (mb.key === "Alle") continue;
      c[mb.key] = mails.filter((m) => m.ownerUsername === mb.username).length;
    }
    return c;
  }, [mails, mailboxes]);

  return (
    <div>
      {/* Postfach-Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {mailboxes.map((mb) => (
          <button
            key={mb.key}
            onClick={() => setMailbox(mb.key)}
            className={
              "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors " +
              (mailbox === mb.key
                ? "border-accent/50 bg-accent/20 text-accent"
                : "border-line bg-white/5 text-muted hover:text-ink")
            }
          >
            {mb.username && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorForUsername(mb.username) }}
              />
            )}
            {mb.label} <span className="opacity-60">{mailboxCounts[mb.key] ?? 0}</span>
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
                  onClick={() => setSelectedId(m.id)}
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
                      <span className="truncate text-sm text-muted">
                        <span className="text-muted/70">An:</span>{" "}
                        <span className="text-ink">{m.toName || m.toEmail}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDayShort(m.date)}
                    </span>
                  </div>
                  <span className="truncate text-sm text-muted">{m.subject}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted">
                Keine gesendeten E-Mails in dieser Auswahl.
              </li>
            )}
          </ul>
        </div>

        {/* Detail mit Volltext */}
        <div className="glass rounded-2xl p-5">
          {!selected ? (
            <p className="text-sm text-muted">Wähle links eine gesendete E-Mail aus.</p>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold leading-snug">
                    {selected.subject}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    An: {selected.toName ? `${selected.toName} · ` : ""}
                    {selected.toEmail}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(selected.date)} · {formatTime(selected.date)} Uhr
                  </p>
                  {selected.ownerEmail && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Send className="h-3 w-3" />
                      gesendet über {selected.ownerEmail}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 max-h-[52vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-white/5 p-4 text-sm text-ink">
                {selected.body || selected.snippet || "(kein Inhalt)"}
              </div>

              {connected && (
                <div className="mt-4">
                  <a
                    href={`https://mail.google.com/mail/u/0/#sent/${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> In Gmail öffnen
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
