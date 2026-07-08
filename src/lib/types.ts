// Gemeinsame Datentypen fuer Kalender und E-Mails (egal ob live oder Demo).

// Ein Kalendertermin
export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO-Zeitstempel
  end: string; // ISO-Zeitstempel
  allDay: boolean;
  location?: string;
};

// Moegliche E-Mail-Kategorien (fuer die Sortierung)
export type MailCategory =
  | "Anfrage"
  | "Rechnung"
  | "Support"
  | "Newsletter"
  | "Sonstiges";

// Eine E-Mail (vereinfachte Darstellung)
export type MailItem = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string; // ISO-Zeitstempel
  unread: boolean;
  category: MailCategory;
};

// Ergebnis-Huelle: sagt der Seite, ob echte Daten kommen oder Demo-Daten
export type DataView<T> = {
  configured: boolean; // sind Google-Zugangsdaten hinterlegt?
  connected: boolean; // hat der Nutzer sein Google-Konto verbunden?
  demo: boolean; // sind das Beispiel-Daten?
  data: T;
};
