"use client";

// Posteingang mit Postfach- und Kategorie-Filter, KI-Antwortvorschlaegen,
// Compose-Fenster (echtes Senden) und Antworten-Flow.
import { useMemo, useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  PenSquare,
  Reply,
  X,
  Send,
} from "lucide-react";
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

type Account = { userId: string; username: string; name: string; connected: boolean };

// Spezielle Postfach-Auswahl: "Alle" oder ein konkreter Benutzername
type Mailbox = "Alle" | string;

export default function MailInbox({
  mails,
  connected,
  ownUsername = "",
  userName = "",
  accounts,
}: {
  mails: MailItem[];
  connected: boolean;
  ownUsername?: string;
  userName?: string;
  accounts?: Account[];
}) {
  const [filter, setFilter] = useState<MailCategory | "Alle">("Alle");
  const [mailbox, setMailbox] = useState<Mailbox>("Alle");
  const [selectedId, setSelectedId] = useState<string | null>(mails[0]?.id ?? null);

  // KI-Vorschlag-Status
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compose-Fenster
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeText, setComposeText] = useState("");
  // Bei einer Antwort: ID der Ursprungs-Mail (fuer Gmail-Threading); sonst undefined
  const [replyToMessageId, setReplyToMessageId] = useState<string | undefined>(undefined);
  // Bei einer Antwort: das Postfach (GoogleAccount.id), in dem die Mail einging –
  // damit die Antwort ueber genau dieses Konto (mit gueltigen Thread-IDs) geht.
  const [composeAccountId, setComposeAccountId] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Signatur mit dem Namen des angemeldeten Nutzers
  const signature = userName ? `\n\nViele Grüße\n${userName}` : "";

  // Verfuegbare Postfaecher: "Alle", "Info" und das persoenliche Postfach
  const mailboxes = useMemo(() => {
    const list: { key: Mailbox; label: string; username: string }[] = [
      { key: "Alle", label: "Alle", username: "" },
      { key: "info", label: "Info", username: "info" },
    ];
    if (ownUsername && ownUsername !== "info") {
      // Anzeigename des Nutzers als Label (Fallback: Benutzername)
      const own = accounts?.find((a) => a.username === ownUsername);
      list.push({
        key: ownUsername,
        label: own?.name || userName || ownUsername,
        username: ownUsername,
      });
    }
    return list;
  }, [ownUsername, userName, accounts]);

  // Gefilterte Liste (Postfach UND Kategorie kombiniert)
  const filtered = useMemo(
    () =>
      mails.filter(
        (m) =>
          (mailbox === "Alle" || m.ownerUsername === mailbox) &&
          (filter === "Alle" || m.category === filter)
      ),
    [mails, filter, mailbox]
  );
  const selected = mails.find((m) => m.id === selectedId) ?? null;

  // Anzahl je Kategorie (im aktuell gewaehlten Postfach)
  const counts = useMemo(() => {
    const inMailbox = mails.filter(
      (m) => mailbox === "Alle" || m.ownerUsername === mailbox
    );
    const c: Record<string, number> = { Alle: inMailbox.length };
    for (const cat of CATEGORIES) c[cat] = inMailbox.filter((m) => m.category === cat).length;
    return c;
  }, [mails, mailbox]);

  // Anzahl je Postfach (fuer die Postfach-Chips)
  const mailboxCounts = useMemo(() => {
    const c: Record<string, number> = { Alle: mails.length };
    for (const mb of mailboxes) {
      if (mb.key === "Alle") continue;
      c[mb.key] = mails.filter((m) => m.ownerUsername === mb.username).length;
    }
    return c;
  }, [mails, mailboxes]);

  // KI-Antwortvorschlag anfordern (gibt den Text auch zurueck)
  async function requestSuggestion(mail: MailItem): Promise<string> {
    const res = await fetch("/api/mails/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: mail.subject,
        fromName: mail.fromName,
        snippet: mail.snippet,
        category: mail.category,
      }),
    });
    const data = await res.json();
    return data.suggestion ?? "";
  }

  // KI-Vorschlag im Detailbereich erzeugen
  async function suggest() {
    if (!selected) return;
    setLoading(true);
    setDraft("");
    setCopied(false);
    try {
      setDraft(await requestSuggestion(selected));
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

  // Compose-Fenster fuer eine neue Mail oeffnen
  function openCompose() {
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeText(signature);
    setReplyToMessageId(undefined);
    setComposeAccountId(undefined);
    setSendError(null);
    setSendSuccess(false);
    setComposeOpen(true);
  }

  // Antworten: Compose-Fenster vorausgefuellt oeffnen
  async function openReply() {
    if (!selected) return;
    // Betreff mit "Re:" (kein doppeltes "Re:")
    const subj = /^re:/i.test(selected.subject.trim())
      ? selected.subject
      : `Re: ${selected.subject}`;
    setComposeTo(selected.fromEmail);
    setComposeCc("");
    setComposeSubject(subj);
    // ID der Ursprungs-Mail merken, damit die Antwort im Gmail-Thread landet
    setReplyToMessageId(selected.id);
    // Ueber das Postfach antworten, in dem die Mail einging
    setComposeAccountId(selected.ownerAccountId);
    setSendError(null);
    setSendSuccess(false);
    setComposeOpen(true);

    // Bereits erzeugten Vorschlag uebernehmen, sonst frisch holen
    if (draft) {
      setComposeText(draft + signature);
    } else {
      setComposeText("");
      setLoading(true);
      try {
        const suggestion = await requestSuggestion(selected);
        setComposeText(suggestion + signature);
      } catch {
        setComposeText(signature);
      } finally {
        setLoading(false);
      }
    }
  }

  // Mail wirklich senden
  async function sendMail() {
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo,
          cc: composeCc,
          subject: composeSubject,
          text: composeText,
          replyToMessageId,
          accountId: composeAccountId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSendError(data.error ?? "Senden fehlgeschlagen");
        return;
      }
      setSendSuccess(true);
      // Fenster nach kurzer Bestaetigung schliessen
      setTimeout(() => setComposeOpen(false), 1200);
    } catch {
      setSendError("Senden fehlgeschlagen");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Kopfzeile mit "Mail schreiben" */}
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={openCompose}
          className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
        >
          <PenSquare className="h-4 w-4" />
          Mail schreiben
        </button>
      </div>

      {/* Postfach-Filter (hervorgehoben, ueber den Kategorien) */}
      <div className="mb-3 flex flex-wrap gap-2">
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
                Keine E-Mails in dieser Auswahl.
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

              {/* Aktionen: Antworten */}
              <div className="mt-4">
                <button
                  onClick={openReply}
                  className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
                >
                  <Reply className="h-4 w-4" />
                  Antworten
                </button>
              </div>

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

      {/* Compose-Fenster (Modal) */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            aria-label="Schließen"
            onClick={() => setComposeOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Fenster */}
          <div className="glass relative z-10 w-full max-w-xl rounded-2xl p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <PenSquare className="h-5 w-5 text-accent" />
                Mail schreiben
              </h2>
              <button
                onClick={() => setComposeOpen(false)}
                className="rounded-lg p-1 text-muted transition-colors hover:text-ink"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="An (E-Mail-Adresse)"
                className="rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                type="text"
                value={composeCc}
                onChange={(e) => setComposeCc(e.target.value)}
                placeholder="Cc (optional, mehrere durch Komma getrennt)"
                className="rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
              />
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Betreff"
                className="rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
              />
              <textarea
                value={composeText}
                onChange={(e) => setComposeText(e.target.value)}
                placeholder={loading ? "KI schreibt einen Entwurf …" : "Nachricht"}
                className="min-h-56 w-full rounded-xl border border-line bg-white/5 p-3 text-sm text-ink outline-none focus:border-accent"
              />

              {sendError && (
                <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                  {sendError}
                </p>
              )}
              {sendSuccess && (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  <Check className="h-4 w-4" /> Mail gesendet.
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setComposeOpen(false)}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  Abbrechen
                </button>
                <button
                  onClick={sendMail}
                  disabled={sending || !composeTo.trim()}
                  className="glow-accent flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:opacity-60"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Senden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
