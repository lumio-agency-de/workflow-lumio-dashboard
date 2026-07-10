"use client";

// Interne Chat-Ansicht: links Konversationsliste (Team + je ein Nutzer als DM),
// rechts der Nachrichtenverlauf mit Eingabefeld. Der Verlauf wird per Polling
// (alle ~4 Sekunden) aktualisiert.
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Hash, Loader2 } from "lucide-react";
import { Panel } from "@/components/panel";
import { colorForUsername } from "@/lib/team";
import { formatTime, formatDayShort } from "@/lib/format";

// Nutzer, wie er vom Server hereinkommt
export type ChatUser = {
  id: string;
  username: string;
  name: string;
};

// Nachricht, wie sie die API zurueckgibt
type ChatMessage = {
  id: string;
  senderId: string;
  scope: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
};

// Ausgewaehlte Konversation: entweder der Team-Channel oder eine DM mit einem Nutzer
type Conversation =
  | { kind: "team" }
  | { kind: "dm"; userId: string };

const POLL_MS = 4000;

// Markiert den Chat als "gesehen": speichert den aktuellen Zeitpunkt und
// benachrichtigt das Ungelesen-Badge in der Seitenleiste, damit es verschwindet.
function markChatSeen() {
  try {
    localStorage.setItem("chatLastSeen", new Date().toISOString());
    window.dispatchEvent(new Event("chat-seen"));
  } catch {
    // localStorage/Window nicht verfuegbar -> ignorieren
  }
}

export default function ChatView({
  meId,
  users,
}: {
  meId: string;
  users: ChatUser[];
}) {
  // Andere Nutzer (nicht ich selbst) fuer die DM-Liste
  const others = users.filter((u) => u.id !== meId);

  // Schnelle Nachschlage-Tabelle: userId -> Nutzer
  const usersById = new Map(users.map((u) => [u.id, u]));

  const [active, setActive] = useState<Conversation>({ kind: "team" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fuer automatisches Scrollen ans Ende
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // Query-String fuer die aktive Konversation bauen
  const queryFor = useCallback((conv: Conversation) => {
    if (conv.kind === "dm") {
      return `?scope=dm&with=${encodeURIComponent(conv.userId)}`;
    }
    return "?scope=team";
  }, []);

  // Verlauf laden. Die Ladeanzeige wird beim Konversationswechsel per
  // setLoading(true) im Klick-Handler gesteuert (nicht hier), damit im Effekt
  // kein synchrones setState noetig ist; hier wird sie nur wieder ausgeschaltet.
  const loadMessages = useCallback(
    async (conv: Conversation) => {
      try {
        const res = await fetch(`/api/chat${queryFor(conv)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { messages?: ChatMessage[] } = await res.json();
        setMessages(data.messages ?? []);
        // Nach erfolgreichem Laden gilt der Chat als gesehen -> Badge zuruecksetzen
        markChatSeen();
      } catch {
        // Netzwerkfehler still ignorieren; naechstes Polling versucht es erneut
      } finally {
        setLoading(false);
      }
    },
    [queryFor]
  );

  // Konversation wechseln: Ladeanzeige an, dann aktive Konversation setzen
  function openConversation(conv: Conversation) {
    setLoading(true);
    setMessages([]);
    setActive(conv);
  }

  // Bei Konversationswechsel: sofort laden + Polling einrichten
  useEffect(() => {
    let cancelled = false;

    // Erstes Laden (Ladeanzeige wurde bereits im Klick-Handler gesetzt)
    void loadMessages(active);

    // Regelmaessiges Nachladen (stiller Refresh)
    const interval = setInterval(() => {
      if (!cancelled) void loadMessages(active);
    }, POLL_MS);

    // Sauber aufraeumen beim Wechsel/Unmount
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, loadMessages]);

  // Beim Betreten des Chats sofort als gesehen markieren (Badge verschwindet)
  useEffect(() => {
    markChatSeen();
  }, []);

  // Nach neuen Nachrichten ans Ende scrollen
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Nachricht senden
  async function sendMessage() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const payload =
        active.kind === "dm"
          ? { scope: "dm", recipientId: active.userId, body }
          : { scope: "team", body };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDraft("");
        // Verlauf direkt aktualisieren, damit die eigene Nachricht sofort erscheint
        await loadMessages(active);
      }
    } catch {
      // stumm; Nutzer kann erneut senden
    } finally {
      setSending(false);
    }
  }

  // Enter sendet, Shift+Enter macht Zeilenumbruch
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  // Titel der aktiven Konversation
  const activeTitle =
    active.kind === "team"
      ? "Team-Channel"
      : usersById.get(active.userId)?.name ?? "Direktnachricht";

  return (
    <Panel className="flex h-[70vh] min-h-[520px] overflow-hidden">
      {/* Linke Spalte: Konversationsliste */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-line">
        <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Konversationen
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto p-2">
          {/* Team-Channel */}
          <button
            type="button"
            onClick={() => openConversation({ kind: "team" })}
            className={
              "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition " +
              (active.kind === "team"
                ? "bg-accent/15 text-accent"
                : "text-ink hover:bg-white/5")
            }
          >
            <Hash className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">Team</span>
          </button>

          {/* DMs je anderem Nutzer */}
          {others.map((u) => {
            const activeDm = active.kind === "dm" && active.userId === u.id;
            const color = colorForUsername(u.username);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => openConversation({ kind: "dm", userId: u.id })}
                className={
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition " +
                  (activeDm ? "bg-accent/15 text-accent" : "text-ink hover:bg-white/5")
                }
              >
                {/* Farbpunkt in der Nutzerfarbe */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate font-medium">{u.name}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Rechte Spalte: Verlauf + Eingabe */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Kopf */}
        <header className="flex items-center gap-2 border-b border-line px-5 py-3">
          {active.kind === "team" ? (
            <Hash className="h-4 w-4 text-accent" />
          ) : (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: colorForUsername(
                  usersById.get(active.userId)?.username ?? ""
                ),
              }}
            />
          )}
          <h2 className="font-display text-sm font-semibold">{activeTitle}</h2>
        </header>

        {/* Verlauf */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              Noch keine Nachrichten. Schreib die erste!
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === meId;
              const sender = usersById.get(m.senderId);
              const senderColor = colorForUsername(sender?.username ?? "");
              const when = new Date(m.createdAt);
              return (
                <div
                  key={m.id}
                  className={
                    "flex flex-col " + (mine ? "items-end" : "items-start")
                  }
                >
                  {/* Absendername (nur bei fremden Nachrichten, in Nutzerfarbe) */}
                  {!mine && (
                    <span
                      className="mb-1 px-1 text-xs font-semibold"
                      style={{ color: senderColor }}
                    >
                      {sender?.name ?? "Unbekannt"}
                    </span>
                  )}
                  <div
                    className={
                      "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm " +
                      (mine
                        ? "bg-accent text-[#06121e]"
                        : "border border-line bg-white/5 text-ink")
                    }
                  >
                    {m.body}
                  </div>
                  {/* Zeitstempel */}
                  <span className="mt-1 px-1 text-[11px] text-muted">
                    {formatDayShort(when)} · {formatTime(when)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        {/* Eingabe */}
        <div className="border-t border-line p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                active.kind === "team"
                  ? "Nachricht an das Team …"
                  : `Nachricht an ${activeTitle} …`
              }
              className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-line bg-white/5 p-3 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || !draft.trim()}
              className="glow-accent flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
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
      </section>
    </Panel>
  );
}
