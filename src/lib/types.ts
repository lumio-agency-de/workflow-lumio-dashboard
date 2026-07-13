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
  // Konkretes Konto (GoogleAccount.id), aus dem der Termin stammt – noetig, um
  // ihn spaeter im richtigen Kalender zu bearbeiten/loeschen (ein Nutzer kann
  // mehrere Konten haben).
  ownerAccountId?: string;
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
  // Konkretes Konto (GoogleAccount.id), in dem die Mail einging – noetig, um die
  // Antwort ueber genau dieses Postfach zu senden (Threading-IDs sind pro
  // Postfach gueltig; ein Nutzer kann mehrere Konten haben).
  ownerAccountId?: string;
};

// Eine GESENDETE (ausgehende) E-Mail – fuer den Postausgang im Dashboard.
// Anders als beim Posteingang interessiert hier der Empfaenger (To) und der
// vollstaendige Nachrichtentext, damit man den Inhalt direkt im Dashboard liest
// (ohne Google Workspace zu oeffnen).
export type SentMailItem = {
  id: string;
  toName: string;
  toEmail: string;
  subject: string;
  snippet: string;
  body: string; // Volltext (Klartext) der gesendeten Mail
  date: string; // ISO-Zeitstempel
  // Aus welchem verbundenen Konto die Mail gesendet wurde (fuer die kombinierte Ansicht)
  ownerUserId?: string;
  ownerUsername?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerAccountId?: string;
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
