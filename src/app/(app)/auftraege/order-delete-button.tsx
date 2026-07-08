"use client";

// Loeschen-Schaltflaeche fuer einen Auftrag mit Sicherheitsabfrage.
import { Trash2 } from "lucide-react";
import { deleteOrder } from "./actions";

export default function OrderDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <form
      action={deleteOrder}
      onSubmit={(e) => {
        if (!confirm(`Auftrag „${title}" wirklich löschen?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Auftrag löschen"
        className="text-muted transition-colors hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}
