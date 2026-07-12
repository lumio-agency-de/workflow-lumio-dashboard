// Gemeinsame Navigationspunkte fuer Seitenleiste (Desktop) und Leiste (Mobil).
import {
  LayoutDashboard,
  Inbox,
  Calendar,
  Mail,
  Briefcase,
  FileText,
  Phone,
  ListChecks,
  Target,
  Radar,
  ClipboardList,
  MailCheck,
  TrendingUp,
  Receipt,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// Einzelner Navigationspunkt (Link)
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

// Ausklappbarer Ordner mit mehreren Unterpunkten
export type NavGroup = {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

// Typwaechter: unterscheidet Ordner von einfachem Link
export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const NAV: NavEntry[] = [
  { href: "/", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/kalender", label: "Kalender", icon: Calendar },
  { href: "/mails", label: "E-Mails", icon: Mail },
  { href: "/telefon", label: "Telefon", icon: Phone },
  { href: "/auswertung", label: "Auswertung", icon: BarChart3 },
  {
    label: "Akquise",
    icon: Radar,
    children: [
      { href: "/leads", label: "Leads", icon: Target },
      { href: "/kontakt-vorbereitung", label: "Kontakt-Vorbereitung", icon: ClipboardList },
      { href: "/kontaktiert", label: "Kontaktiert", icon: MailCheck },
    ],
  },
  {
    label: "Vertrieb",
    icon: TrendingUp,
    children: [
      { href: "/anfragen", label: "Anfragen", icon: Inbox },
      { href: "/angebote", label: "Angebote", icon: FileText },
      { href: "/rechnungen", label: "Rechnungen", icon: Receipt },
      { href: "/auftraege", label: "Aufträge", icon: Briefcase },
    ],
  },
  { href: "/todos", label: "To-Dos", icon: ListChecks },
];

// Flache Liste aller Links (fuer die mobile Leiste, die keine Ordner kennt)
export const NAV_FLAT: NavItem[] = NAV.flatMap((entry) =>
  isNavGroup(entry) ? entry.children : [entry]
);
