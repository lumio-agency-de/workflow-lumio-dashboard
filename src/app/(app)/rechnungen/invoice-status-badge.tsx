// Farbiges Status-Badge fuer eine Rechnung (offen / bezahlt / ueberfaellig).
// Serverkomponente – nutzt die geteilte Status-Logik aus @/lib/invoice.
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_STYLE } from "@/lib/invoice";

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const style = INVOICE_STATUS_STYLE[status] ?? INVOICE_STATUS_STYLE.offen;
  const label = INVOICE_STATUS_LABEL[status] ?? INVOICE_STATUS_LABEL.offen;
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium " +
        style
      }
    >
      {label}
    </span>
  );
}
