"use client";

// Startet einmalig automatisch den PDF-Download, wenn eine Rechnung neu erstellt wurde.
import { useEffect, useRef } from "react";

export default function AutoDownload({ url }: { url: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Da der Endpunkt das PDF als Download (attachment) liefert,
    // bleibt die Seite offen und das PDF wird heruntergeladen.
    window.location.href = url;
  }, [url]);

  return null;
}
