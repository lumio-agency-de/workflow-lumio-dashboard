"use client";

// Kleines Status-Auswahlfeld, das die Aenderung sofort speichert.
import { useRef } from "react";
import { updateInvoiceStatus } from "./actions";
import { INVOICE_STATUS, INVOICE_STATUS_LABEL } from "@/lib/invoice";

export default function InvoiceStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateInvoiceStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-line bg-white/5 px-2 py-1 text-sm text-ink outline-none focus:border-accent"
      >
        {INVOICE_STATUS.map((value) => (
          <option key={value} value={value} className="bg-[#0c131f]">
            {INVOICE_STATUS_LABEL[value]}
          </option>
        ))}
      </select>
    </form>
  );
}
