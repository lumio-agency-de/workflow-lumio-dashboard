"use client";

// Status-Auswahl eines Auftrags – speichert sofort bei Aenderung.
import { useRef } from "react";
import { updateOrderStatus } from "./actions";

const OPTIONS = [
  { value: "offen", label: "Offen" },
  { value: "in_arbeit", label: "In Arbeit" },
  { value: "wartet", label: "Wartet" },
  { value: "erledigt", label: "Erledigt" },
];

export default function OrderStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateOrderStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-line bg-white/5 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
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
