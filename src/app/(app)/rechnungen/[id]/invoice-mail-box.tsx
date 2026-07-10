"use client";

// Compose-Feld auf der Rechnungs-Detailseite: Rechnung oder Zahlungserinnerung
// per Mail (ueber info@) mit PDF-Anhang verschicken. Empfaenger/Betreff/Text sind
// vorbefuellt und frei editierbar; zwei Vorlagen-Buttons fuellen den Text.
import { useState } from "react";
import { Mail, Bell } from "lucide-react";
import { sendInvoiceMail } from "../actions";

const inputClass =
  "w-full rounded-lg border border-line bg-white/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent";

export default function InvoiceMailBox({
  invoiceId,
  invoiceNumber,
  customerEmail,
  customerName,
  dueDateFormatted,
  greetingName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  customerEmail: string;
  customerName: string;
  dueDateFormatted: string;
  greetingName: string;
}) {
  // Standard-Anschreiben (Rechnungsversand)
  const invoiceText =
    `Sehr geehrte Damen und Herren,\n\n` +
    `anbei erhalten Sie unsere Rechnung ${invoiceNumber} als PDF.\n` +
    `Wir bitten um Begleichung des Rechnungsbetrags bis zum ${dueDateFormatted}.\n\n` +
    `Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\n` +
    `Mit freundlichen Grüßen\n${greetingName}`;

  // Vorlage Zahlungserinnerung (freundliche, formlose Erinnerung – kein Mahnwesen)
  const reminderText =
    `Sehr geehrte Damen und Herren,\n\n` +
    `sicher ist es Ihrer Aufmerksamkeit entgangen: Unsere Rechnung ${invoiceNumber} ` +
    `(fällig am ${dueDateFormatted}) ist bislang noch offen.\n` +
    `Wir möchten Sie freundlich an die Begleichung erinnern und hängen die Rechnung ` +
    `zur einfacheren Zuordnung noch einmal an.\n\n` +
    `Sollten Sie den Betrag bereits überwiesen haben, betrachten Sie diese Nachricht ` +
    `bitte als gegenstandslos.\n\n` +
    `Mit freundlichen Grüßen\n${greetingName}`;

  const [to, setTo] = useState(customerEmail);
  const [subject, setSubject] = useState(
    `Ihre Rechnung ${invoiceNumber} von Lumio`
  );
  const [text, setText] = useState(invoiceText);

  return (
    <form action={sendInvoiceMail} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={invoiceId} />

      {/* Vorlagen-Umschalter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSubject(`Ihre Rechnung ${invoiceNumber} von Lumio`);
            setText(invoiceText);
          }}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
        >
          <Mail className="h-3.5 w-3.5" /> Rechnung
        </button>
        <button
          type="button"
          onClick={() => {
            setSubject(`Zahlungserinnerung zu Rechnung ${invoiceNumber}`);
            setText(reminderText);
          }}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
        >
          <Bell className="h-3.5 w-3.5" /> Zahlungserinnerung
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Empfänger {customerName ? `(${customerName})` : ""}
        <input
          name="to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="kunde@example.de"
          required
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Betreff
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Nachricht
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass + " min-h-40"}
        />
      </label>

      <p className="text-xs text-muted">
        Versand über das offizielle info@-Postfach. Die Rechnung wird automatisch
        als PDF angehängt.
      </p>

      <button
        type="submit"
        className="glow-accent flex items-center justify-center gap-2 self-start rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-[#06121e] transition hover:bg-accent-2"
      >
        <Mail className="h-4 w-4" /> Per Mail senden
      </button>
    </form>
  );
}
