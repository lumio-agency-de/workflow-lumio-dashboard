// Gemeinsame Datentypen fuer Kalender und E-Mails (egal ob live oder Demo).

// Ein Kalendertermin
export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO-Zeitstempel
  end: string; // ISO-Zeitstempel
  allDay: boolean;
  location?: string;
  // Wessen verbundenes Google-Konto dieser Termin gehoert (fuer die kombinierte Ansicht)
  ownerUserId?: string;
  ownerUsername?: string;
  ownerName?: string;
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
  // Ueber wessen verbundenes Google-Konto diese Mail einging (fuer die kombinierte Ansicht)
  ownerUserId?: string;
  ownerUsername?: string;
  ownerName?: string;
  ownerEmail?: string;
};

// Ergebnis-Huelle: sagt der Seite, ob echte Daten kommen oder Demo-Daten
export type DataView<T> = {
  configured: boolean; // sind Google-Zugangsdaten hinterlegt?
  connected: boolean; // ist mindestens ein Google-Konto verbunden?
  selfConnected: boolean; // ist das eigene Google-Konto des angemeldeten Nutzers verbunden?
  demo: boolean; // sind das Beispiel-Daten?
  data: T;
  // Team-Uebersicht: wer hat sein Google-Konto verbunden (fuer die kombinierte Ansicht)
  accounts?: { userId: string; username: string; name: string; connected: boolean }[];
};
