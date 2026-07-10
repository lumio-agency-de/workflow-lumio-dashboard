// Schlichte, barrierearme Inline-Diagramme fuer die Auswertungs-Seite.
// KEINE externe Chart-Bibliothek (strenge CSP) – nur HTML + SVG.
// Farben kommen aus den Design-Tokens/Tailwind-Klassen (accent, emerald, line,
// text-muted …), nie als harte Hex-Werte. Jeder Wert ist zusaetzlich als Zahl
// lesbar, damit Farbe nie die einzige Information ist.
import { formatEuro } from "@/lib/format";
import type { UmsatzMonat, FunnelStufe } from "@/lib/auswertung";
import { UMSATZ_QUELLEN } from "@/lib/auswertung";

// ---------------------------------------------------------------------------
// Umsatz je Monat – gestapelte Saeulen (angenommene Angebote + erledigte Auftraege)
// ---------------------------------------------------------------------------
export function UmsatzBalken({
  monate,
  max,
}: {
  monate: UmsatzMonat[];
  max: number;
}) {
  // Ohne Umsatz gibt es nichts zu skalieren -> freundlicher Hinweis.
  if (max <= 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Noch kein Umsatz im Zeitraum erfasst.
      </div>
    );
  }

  return (
    <div>
      {/* Diagrammflaeche */}
      <div className="flex h-52 items-end gap-2 sm:gap-3">
        {monate.map((m) => {
          const angPct = (m.angenommen / max) * 100;
          const aufPct = (m.auftraege / max) * 100;
          return (
            <div
              key={m.key}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={`${m.label}: ${formatEuro(m.gesamt)} (Angebote ${formatEuro(
                m.angenommen
              )}, Aufträge ${formatEuro(m.auftraege)})`}
            >
              {/* Wert ueber der Saeule (nur wenn > 0, sonst zu voll) */}
              <span className="mb-1 text-[10px] font-medium text-muted">
                {m.gesamt > 0 ? formatEuro(m.gesamt).replace(/\s?€/, "") : ""}
              </span>
              {/* Saeule: von unten nach oben gestapelt */}
              <div className="flex w-full max-w-[40px] flex-col justify-end">
                {/* erledigte Auftraege (unten) */}
                <div
                  className="w-full rounded-b-[3px] bg-emerald-400/80"
                  style={{ height: `${aufPct * 1.6}px` }}
                />
                {/* 2px Trennspalt zwischen den Segmenten */}
                {aufPct > 0 && angPct > 0 && <div className="h-[2px]" />}
                {/* angenommene Angebote (oben) */}
                <div
                  className="w-full rounded-t-[3px] bg-accent/85"
                  style={{ height: `${angPct * 1.6}px` }}
                />
              </div>
              <span className="mt-2 text-[11px] text-muted">{m.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        {UMSATZ_QUELLEN.map((q) => (
          <span key={q.key} className="inline-flex items-center gap-1.5">
            <span
              className={
                "h-2.5 w-2.5 rounded-[3px] " +
                (q.key === "angenommen" ? "bg-accent/85" : "bg-emerald-400/80")
              }
            />
            {q.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion – Ring/Donut (angenommen vs. abgelehnt), Prozentzahl in der Mitte
// ---------------------------------------------------------------------------
export function ConversionRing({
  quote,
  angenommen,
  abgelehnt,
}: {
  quote: number; // 0..100
  angenommen: number;
  abgelehnt: number;
}) {
  const r = 42;
  const umfang = 2 * Math.PI * r;
  const anteil = Math.max(0, Math.min(quote, 100)) / 100;
  const gefuellt = umfang * anteil;

  return (
    <div className="flex items-center gap-5">
      <svg
        viewBox="0 0 100 100"
        className="h-28 w-28 shrink-0"
        role="img"
        aria-label={`Angebote angenommen: ${quote} Prozent`}
      >
        {/* Ring-Gruppe um -90° gedreht, damit der Bogen oben startet.
            Nur die Kreise drehen – die Prozentzahl bleibt waagerecht. */}
        <g transform="rotate(-90 50 50)">
          {/* Grundring */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="stroke-white/10"
            strokeWidth="10"
          />
          {/* Gewonnener Anteil */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            className="stroke-accent"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${gefuellt} ${umfang - gefuellt}`}
          />
        </g>
        {/* Prozentzahl mittig */}
        <text
          x="50"
          y="50"
          className="fill-ink font-display text-[20px] font-bold"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {quote}%
        </text>
      </svg>

      <div className="min-w-0 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-muted">Angenommen</span>
          <span className="ml-auto font-semibold">{angenommen}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="text-muted">Abgelehnt</span>
          <span className="ml-auto font-semibold">{abgelehnt}</span>
        </div>
        <p className="mt-3 text-xs text-muted">
          Quote aus entschiedenen Angeboten
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Akquise-Funnel – gestufte Balken. Sequenzielle Accent-Abstufung (eine Farbe,
// hell -> gedeckt) statt bunt, damit die Stufenfolge als Progression lesbar ist.
// ---------------------------------------------------------------------------
export function FunnelBalken({
  stufen,
  max,
}: {
  stufen: FunnelStufe[];
  max: number;
}) {
  // Deckkraft je Stufe: vorne kraeftig, hinten dezenter (feste Reihenfolge).
  const opac = ["bg-accent", "bg-accent/80", "bg-accent/65", "bg-accent/50", "bg-accent/40"];

  return (
    <div className="flex flex-col gap-3">
      {stufen.map((s, i) => {
        const pct = max > 0 ? Math.round((s.anzahl / max) * 100) : 0;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-muted">{s.label}</span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
              <div
                className={"h-full rounded-md " + (opac[i] ?? "bg-accent/40")}
                style={{ width: `${Math.max(pct, s.anzahl > 0 ? 6 : 0)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
              {s.anzahl}
            </span>
          </div>
        );
      })}
      {max <= 0 && (
        <p className="text-sm text-muted">Noch keine Akquise-Kontakte erfasst.</p>
      )}
    </div>
  );
}
