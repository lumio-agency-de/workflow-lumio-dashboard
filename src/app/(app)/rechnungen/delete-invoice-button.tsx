"use client";

// Loeschen-Schaltflaeche mit Sicherheitsabfrage, damit nichts versehentlich
// geloescht wird.
import { deleteInvoice } from "./actions";

export default function DeleteInvoiceButton({
  id,
  number,
  className,
  label = "Löschen",
}: {
  id: string;
  number: string;
  className?: string;
  label?: string;
}) {
  return (
    <form
      action={deleteInvoice}
      onSubmit={(e) => {
        // Vor dem Loeschen nachfragen; bei "Abbrechen" nichts tun
        if (
          !confirm(
            `Rechnung ${number} wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={
          className ??
          "font-medium text-rose-400 transition hover:text-rose-300"
        }
      >
        {label}
      </button>
    </form>
  );
}
