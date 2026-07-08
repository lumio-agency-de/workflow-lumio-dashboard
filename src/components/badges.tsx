// Farbige Kennzeichnungen (Badges) fuer Kategorien und Status.
import type { MailCategory } from "@/lib/types";

// Grundbaustein eines Badges
function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium " +
        className
      }
    >
      {children}
    </span>
  );
}

// Farbe je E-Mail-Kategorie
const CATEGORY_STYLES: Record<MailCategory, string> = {
  Anfrage: "border-accent/30 bg-accent/10 text-accent",
  Rechnung: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  Support: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  Newsletter: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  Sonstiges: "border-line bg-white/5 text-muted",
};

export function CategoryBadge({ category }: { category: MailCategory }) {
  return <Badge className={CATEGORY_STYLES[category]}>{category}</Badge>;
}

// Status eines Auftrags (Text + Farbe)
const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  offen: { label: "Offen", className: "border-line bg-white/5 text-muted" },
  in_arbeit: {
    label: "In Arbeit",
    className: "border-accent/30 bg-accent/10 text-accent",
  },
  wartet: {
    label: "Wartet",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  erledigt: {
    label: "Erledigt",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? ORDER_STATUS.offen;
  return <Badge className={s.className}>{s.label}</Badge>;
}

// Status einer Anfrage (Lead-Pipeline)
const LEAD_STATUS: Record<string, { label: string; className: string }> = {
  neu: { label: "Neu", className: "border-accent/30 bg-accent/10 text-accent" },
  angebot_erstellt: {
    label: "Angebot erstellt",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  angebot_gesendet: {
    label: "Angebot gesendet",
    className: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  },
  gewonnen: {
    label: "Gewonnen",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  verloren: {
    label: "Verloren",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  },
};

export function LeadStatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUS[status] ?? LEAD_STATUS.neu;
  return <Badge className={s.className}>{s.label}</Badge>;
}

// Kapazitaets-Ampel (frei/knapp/voll)
const CAPACITY_STYLES: Record<string, { dot: string; className: string }> = {
  frei: {
    dot: "bg-emerald-400",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  knapp: {
    dot: "bg-amber-400",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  },
  voll: {
    dot: "bg-rose-400",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  },
};

export function CapacityBadge({
  level,
  label,
}: {
  level: string;
  label: string;
}) {
  const s = CAPACITY_STYLES[level] ?? CAPACITY_STYLES.frei;
  return (
    <Badge className={s.className}>
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${s.dot} animate-lumio-pulse`} />
      {label}
    </Badge>
  );
}

// Status eines Angebots
const OFFER_STATUS: Record<string, { label: string; className: string }> = {
  offen: { label: "Offen", className: "border-line bg-white/5 text-muted" },
  angenommen: {
    label: "Angenommen",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  },
  abgelehnt: {
    label: "Abgelehnt",
    className: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  },
};

export function OfferStatusBadge({ status }: { status: string }) {
  const s = OFFER_STATUS[status] ?? OFFER_STATUS.offen;
  return <Badge className={s.className}>{s.label}</Badge>;
}
