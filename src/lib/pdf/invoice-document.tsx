// PDF-Vorlage fuer eine Rechnung (mit @react-pdf/renderer).
// Aufbau bewusst nah an offer-document.tsx – gleiche Optik, andere Ueberschrift,
// Faelligkeit statt "gueltig bis" und Rechnungs-Pflichttexte.
// Diese Datei laeuft NUR auf dem Server.
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";
import { formatEuro, formatDate } from "@/lib/format";
import {
  LUMIO_ACCENT,
  LUMIO_SENDER,
  LUMIO_USTG_HINWEIS,
  LUMIO_ZAHLUNGSBEDINGUNGEN,
  LUMIO_LOGO_PATH,
} from "@/lib/lumio";

// Datenform, die das PDF braucht (Rechnung inkl. Positionen)
type InvoiceItem = {
  position: number;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceForPdf = {
  number: string;
  date: Date | string;
  dueDate: Date | string;
  customerCompany: string;
  customerContact: string;
  customerStreet: string;
  customerZip: string;
  customerCity: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  total: number;
  items: InvoiceItem[];
};

// Styles des PDFs (identisch zur Angebots-Vorlage, damit beide Dokumente
// als eine Serie wirken)
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 45,
    paddingBottom: 80, // Platz fuer den festen Footer
    fontSize: 10,
    color: "#1e293b",
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoBox: { width: 160 },
  logoImage: { maxWidth: 160, maxHeight: 55, objectFit: "contain" },
  logoPlaceholder: { fontSize: 24, fontWeight: "bold", color: "#0f172a" },
  logoDot: { color: LUMIO_ACCENT },
  sender: { textAlign: "right", fontSize: 9, color: "#475569" },
  senderName: { fontSize: 11, fontWeight: "bold", color: "#0f172a" },
  accentLine: {
    height: 2,
    backgroundColor: LUMIO_ACCENT,
    marginTop: 14,
    marginBottom: 22,
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  recipientLabel: {
    fontSize: 8,
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  recipientName: { fontWeight: "bold" },
  metaBox: { textAlign: "right", fontSize: 9 },
  metaLabel: { color: "#94a3b8" },
  title: { fontSize: 20, fontWeight: "bold", marginTop: 28, marginBottom: 4 },
  table: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  th: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 8,
    color: "#475569",
    textTransform: "uppercase",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f6",
  },
  colPos: { width: "8%" },
  colLabel: { width: "44%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "18%", textAlign: "right" },
  colSum: { width: "18%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
  },
  totalBox: {
    width: "45%",
    backgroundColor: "#f1f5f9",
    borderLeftWidth: 3,
    borderLeftColor: LUMIO_ACCENT,
    padding: 10,
  },
  totalLabel: { fontSize: 9, color: "#475569" },
  totalValue: { fontSize: 15, fontWeight: "bold", color: "#0f172a" },
  ustgNote: { fontSize: 8, color: "#64748b", marginTop: 4 },
  block: { marginTop: 18 },
  blockTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 3,
  },
  blockText: { fontSize: 9, color: "#334155" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    fontSize: 7.5,
    color: "#94a3b8",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// Hilfszelle fuer Tabellenzeilen
function Cell({
  style,
  children,
}: {
  style: (typeof styles)[keyof typeof styles];
  children: React.ReactNode;
}) {
  return <Text style={style}>{children}</Text>;
}

// Das eigentliche PDF-Dokument
function InvoiceDocument({
  invoice,
  logo,
}: {
  invoice: InvoiceForPdf;
  logo: { data: Buffer } | null;
}) {
  return (
    <Document title={`Rechnung ${invoice.number}`} author={LUMIO_SENDER.name}>
      <Page size="A4" style={styles.page}>
        {/* Kopf: Logo links, Absender rechts */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {logo ? (
              <Image style={styles.logoImage} src={logo.data} />
            ) : (
              <Text style={styles.logoPlaceholder}>
                Lumio<Text style={styles.logoDot}>.</Text>
              </Text>
            )}
          </View>
          <View style={styles.sender}>
            <Text style={styles.senderName}>{LUMIO_SENDER.name}</Text>
            <Text>{LUMIO_SENDER.street}</Text>
            <Text>{LUMIO_SENDER.zipCity}</Text>
            <Text>{LUMIO_SENDER.email}</Text>
            <Text>{LUMIO_SENDER.phone}</Text>
          </View>
        </View>

        <View style={styles.accentLine} />

        {/* Empfaenger + Rechnungs-Meta */}
        <View style={styles.metaRow}>
          <View style={{ width: "55%" }}>
            <Text style={styles.recipientLabel}>Rechnung an</Text>
            <Text style={styles.recipientName}>{invoice.customerCompany}</Text>
            {invoice.customerContact ? (
              <Text>{invoice.customerContact}</Text>
            ) : null}
            {invoice.customerStreet ? (
              <Text>{invoice.customerStreet}</Text>
            ) : null}
            {invoice.customerZip || invoice.customerCity ? (
              <Text>
                {invoice.customerZip} {invoice.customerCity}
              </Text>
            ) : null}
          </View>
          <View style={styles.metaBox}>
            <Text>
              <Text style={styles.metaLabel}>Rechnungsnr.: </Text>
              {invoice.number}
            </Text>
            <Text>
              <Text style={styles.metaLabel}>Datum: </Text>
              {formatDate(invoice.date)}
            </Text>
            <Text>
              <Text style={styles.metaLabel}>Fällig bis: </Text>
              {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Rechnung</Text>

        {/* Positionstabelle */}
        <View style={styles.table}>
          <View style={styles.th}>
            <Cell style={styles.colPos}>Pos.</Cell>
            <Cell style={styles.colLabel}>Bezeichnung</Cell>
            <Cell style={styles.colQty}>Menge</Cell>
            <Cell style={styles.colPrice}>Einzelpreis</Cell>
            <Cell style={styles.colSum}>Gesamt</Cell>
          </View>

          {invoice.items.map((item) => (
            <View style={styles.tr} key={item.position} wrap={false}>
              <Cell style={styles.colPos}>{item.position}</Cell>
              <Cell style={styles.colLabel}>{item.label}</Cell>
              <Cell style={styles.colQty}>
                {Number.isInteger(item.quantity)
                  ? item.quantity
                  : item.quantity.toLocaleString("de-DE")}
              </Cell>
              <Cell style={styles.colPrice}>{formatEuro(item.unitPrice)}</Cell>
              <Cell style={styles.colSum}>{formatEuro(item.lineTotal)}</Cell>
            </View>
          ))}
        </View>

        {/* Gesamtsumme */}
        <View style={styles.totalRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Rechnungsbetrag (netto)</Text>
            <Text style={styles.totalValue}>{formatEuro(invoice.total)}</Text>
            <Text style={styles.ustgNote}>{LUMIO_USTG_HINWEIS}</Text>
          </View>
        </View>

        {/* Zahlungsbedingungen inkl. konkreter Faelligkeit */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Zahlungsbedingungen</Text>
          <Text style={styles.blockText}>
            {LUMIO_ZAHLUNGSBEDINGUNGEN} Bitte begleichen Sie den Rechnungsbetrag
            bis zum {formatDate(invoice.dueDate)}.
          </Text>
        </View>

        {/* Notizen, falls vorhanden */}
        {invoice.notes?.trim() ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Anmerkungen</Text>
            <Text style={styles.blockText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer mit Impressums-Pflichtangaben (Platzhalter) */}
        <View style={styles.footer} fixed>
          <Text>
            {LUMIO_SENDER.name} · {LUMIO_SENDER.owner}
          </Text>
          <Text>
            {LUMIO_SENDER.street}, {LUMIO_SENDER.zipCity} ·{" "}
            {LUMIO_SENDER.taxNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Liest das Logo (falls vorhanden) und erzeugt das PDF als Buffer.
export async function renderInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
  // Logo aus /public laden, falls die Datei existiert
  let logo: { data: Buffer } | null = null;
  try {
    const logoPath = path.join(process.cwd(), LUMIO_LOGO_PATH);
    if (fs.existsSync(logoPath)) {
      logo = { data: fs.readFileSync(logoPath) };
    }
  } catch {
    logo = null; // bei Problemen einfach den Text-Platzhalter nutzen
  }

  return renderToBuffer(<InvoiceDocument invoice={invoice} logo={logo} />);
}
