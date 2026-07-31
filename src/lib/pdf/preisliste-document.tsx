// PDF-Vorlage fuer die Kunden-Preisliste (mit @react-pdf/renderer).
// Aufbau bewusst wie offer-document.tsx, damit Angebot und Preisliste beim
// Kunden nach derselben Firma aussehen. Diese Datei laeuft NUR auf dem Server.
//
// ============================ PLATZHALTER-FASSUNG ============================
// Die endgueltige Preisliste gestaltet MIKO (Stand 31.07.2026). Bis seine
// Fassung da ist, traegt jede Seite oben ein deutliches PLATZHALTER-Band, damit
// niemand den Entwurf versehentlich an einen Kunden schickt.
//
// Wenn Mikos Fassung fertig ist:
//   * Liegt sie als fertiges PDF vor -> Datei ablegen und in der Route
//     src/app/api/akquise/preisliste/entwurf/route.ts statt renderPreislistePdf
//     einfach einlesen.
//   * Soll sie hier nachgebaut werden -> Layout unten ersetzen und das
//     PLATZHALTER-Band (Konstante PLATZHALTER) entfernen.
// Die Preisdaten selbst stehen in src/lib/preisliste.ts.
// =============================================================================
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
import { formatDate } from "@/lib/format";
import {
  LUMIO_ACCENT,
  LUMIO_SENDER,
  LUMIO_USTG_HINWEIS,
  LUMIO_LOGO_PATH,
} from "@/lib/lumio";
import { PAKETE, IMMER_ENTHALTEN, HINWEIS_BETRIEB } from "@/lib/preisliste";

// Auf false setzen, sobald Mikos endgueltige Preisliste steht – dann
// verschwindet das Warnband oben auf der Seite.
const PLATZHALTER = true;

const styles = StyleSheet.create({
  // Die Preisliste soll auf EINE Seite passen – Abstaende sind deshalb
  // bewusst enger als im Angebots-PDF.
  page: {
    paddingTop: 34,
    paddingHorizontal: 45,
    paddingBottom: 66,
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
    marginTop: 10,
    marginBottom: 12,
  },
  // Deutliches Band, solange Mikos endgueltige Fassung fehlt
  platzhalterBand: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 8.5,
    color: "#92400e",
    textAlign: "center",
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
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  subtitle: { fontSize: 9, color: "#64748b", marginBottom: 2 },

  // Ein Paket als Karte
  paket: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 3,
    borderLeftColor: "#e2e8f0",
    padding: 10,
  },
  paketHervor: { borderLeftColor: LUMIO_ACCENT, backgroundColor: "#f8fafc" },
  paketKopf: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  paketName: { fontSize: 13, fontWeight: "bold", color: "#0f172a" },
  paketBadge: { fontSize: 7.5, color: LUMIO_ACCENT, marginTop: 3 },
  paketPreis: { fontSize: 15, fontWeight: "bold", color: "#0f172a" },
  punkt: { fontSize: 9.5, color: "#334155", marginBottom: 1 },

  block: { marginTop: 12 },
  blockTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  blockText: { fontSize: 9, color: "#334155" },
  hinweis: {
    marginTop: 10,
    backgroundColor: "#f1f5f9",
    borderLeftWidth: 3,
    borderLeftColor: LUMIO_ACCENT,
    padding: 9,
    fontSize: 9,
    color: "#334155",
  },
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

function PreislisteDocument({
  firma,
  datum,
  logo,
}: {
  firma: string;
  datum: Date;
  logo: { data: Buffer } | null;
}) {
  return (
    <Document title="Lumio — Website-Pakete" author={LUMIO_SENDER.name}>
      <Page size="A4" style={styles.page}>
        {/* Kopf: Logo links, Absender rechts */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {logo ? (
              // @react-pdf/renderer Image (kein HTML-img) – alt-Regel greift hier nicht
              // eslint-disable-next-line jsx-a11y/alt-text
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

        {/* Platzhalter-Hinweis – entfaellt mit Mikos endgueltiger Fassung */}
        {PLATZHALTER ? (
          <Text style={styles.platzhalterBand}>
            PLATZHALTER — vorläufige Fassung, nicht an Kunden versenden. Die
            endgültige Preisliste wird gerade erstellt.
          </Text>
        ) : null}

        {/* Empfaenger (falls bekannt) + Datum */}
        <View style={styles.metaRow}>
          <View style={{ width: "55%" }}>
            {firma ? (
              <>
                <Text style={styles.recipientLabel}>Für</Text>
                <Text style={styles.recipientName}>{firma}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.metaBox}>
            <Text>
              <Text style={styles.metaLabel}>Stand: </Text>
              {formatDate(datum)}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Website-Pakete</Text>
        <Text style={styles.subtitle}>
          Individuell gebaut, kein Baukasten — die fertige Website gehört Ihnen.
        </Text>

        {/* Die drei Pakete */}
        {PAKETE.map((p) => (
          <View
            key={p.name}
            style={
              p.hervorgehoben
                ? { ...styles.paket, ...styles.paketHervor }
                : styles.paket
            }
            wrap={false}
          >
            <View style={styles.paketKopf}>
              <View>
                <Text style={styles.paketName}>{p.name}</Text>
                {p.hervorgehoben ? (
                  <Text style={styles.paketBadge}>BELIEBTESTE WAHL</Text>
                ) : null}
              </View>
              <Text style={styles.paketPreis}>{p.preis}</Text>
            </View>
            {p.umfang.map((z) => (
              <Text key={z} style={styles.punkt}>
                ·  {z}
              </Text>
            ))}
          </View>
        ))}

        {/* Immer enthalten */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>In jedem Paket enthalten</Text>
          {IMMER_ENTHALTEN.map((z) => (
            <Text key={z} style={styles.punkt}>
              ·  {z}
            </Text>
          ))}
        </View>

        {/* Betrieb & Pflege – bewusst ohne Preis */}
        <Text style={styles.hinweis}>{HINWEIS_BETRIEB}</Text>

        <View style={styles.block}>
          <Text style={styles.blockText}>
            Die genannten Beträge sind Startpreise. Den genauen Umfang stimmen wir
            vorher gemeinsam ab; anschließend erhalten Sie ein verbindliches
            Angebot. {LUMIO_USTG_HINWEIS}
          </Text>
        </View>

        {/* Footer mit Impressums-Pflichtangaben (Platzhalter) */}
        <View style={styles.footer} fixed>
          <Text>
            {LUMIO_SENDER.name} · {LUMIO_SENDER.owner}
          </Text>
          <Text>
            {LUMIO_SENDER.street}, {LUMIO_SENDER.zipCity} · {LUMIO_SENDER.taxNumber}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// Liest das Logo (falls vorhanden) und erzeugt das PDF als Buffer.
export async function renderPreislistePdf(firma: string): Promise<Buffer> {
  let logo: { data: Buffer } | null = null;
  try {
    const logoPath = path.join(process.cwd(), LUMIO_LOGO_PATH);
    if (fs.existsSync(logoPath)) {
      logo = { data: fs.readFileSync(logoPath) };
    }
  } catch {
    logo = null; // bei Problemen einfach den Text-Platzhalter nutzen
  }

  return renderToBuffer(
    <PreislisteDocument firma={firma.trim()} datum={new Date()} logo={logo} />
  );
}
