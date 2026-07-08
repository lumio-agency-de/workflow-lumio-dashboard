"use client";

// Kleines Status-Auswahlfeld, das die Aenderung sofort speichert.
import { useRef } from "react";
import { updateOfferStatus } from "./actions";

const OPTIONS = [
  { value: "offen", label: "Offen" },
  { value: "angenommen", label: "Angenommen" },
  { value: "abgelehnt", label: "Abgelehnt" },
];

export default function StatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateOfferStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-line bg-white/5 px-2 py-1 text-sm text-ink outline-none focus:border-accent"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0c131f]">
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
