"use client";

// Kleines Ungelesen-Badge fuer den Chat-Link in der Seitenleiste.
// Pollt die Anzahl ungelesener Nachrichten seit dem letzten Besuch des Chats
// (in localStorage["chatLastSeen"] gespeichert) und blendet sich aus, sobald
// alles gesehen wurde. Waehrend man im Chat ist, feuert die Chat-Ansicht das
// window-Event "chat-seen", woraufhin der Zaehler zurueckgesetzt wird.
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "chatLastSeen";
const POLL_MS = 15000;

export default function ChatUnreadBadge() {
  const [count, setCount] = useState(0);
  // Referenz auf den zuletzt genutzten "seen"-Zeitpunkt fuer das Polling
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    // Beim Mount: gespeicherten Zeitpunkt lesen oder initial auf jetzt setzen
    let lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      lastSeen = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, lastSeen);
    }
    lastSeenRef.current = lastSeen;

    let cancelled = false;

    // Ungelesen-Zahl vom Server holen
    async function fetchCount() {
      const since = lastSeenRef.current;
      if (!since) return;
      try {
        const res = await fetch(
          `/api/chat/unread?since=${encodeURIComponent(since)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data: { count?: number } = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        // Netzwerkfehler still ignorieren; naechstes Polling versucht es erneut
      }
    }

    // Sofort laden + regelmaessig nachpollen
    void fetchCount();
    const interval = setInterval(() => void fetchCount(), POLL_MS);

    // Auf das "chat-seen"-Event reagieren: Zaehler zuruecksetzen und
    // den lokalen "seen"-Zeitpunkt auf jetzt aktualisieren
    function onSeen() {
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, now);
      lastSeenRef.current = now;
      setCount(0);
    }
    window.addEventListener("chat-seen", onSeen);

    // Sauber aufraeumen
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("chat-seen", onSeen);
    };
  }, []);

  // Nur bei tatsaechlich ungelesenen Nachrichten anzeigen
  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-[#06121e]">
      {count}
    </span>
  );
}
