# Lumio Dashboard

Internes Unternehmens-Dashboard von Lumio. Vereint an einem Ort:

- **Übersicht** – Kennzahlen & Widgets (Termine, ungelesene Mails, offene Aufträge/Angebote)
- **Anfragen** – automatische Lead-Pipeline: E-Mail-Anfragen werden erkannt, mit
  **Kapazitäts-Ampel** (Kalender + Aufträge) bewertet; per Klick entsteht ein
  KI-gestützter **Angebots-Entwurf**, dann ein **E-Mail-Vorschlag**, Versand mit
  PDF-Anhang direkt über Gmail; „Gewonnen“ legt automatisch einen Auftrag an,
  nach 7 Tagen ohne Antwort erscheint eine **Wiedervorlage**
- **Kalender** – Termine (Google Kalender), Monatsansicht + Anlegen
- **E-Mails** – Posteingang (Gmail) mit automatischer **Kategorisierung** und **KI-Antwortvorschlägen**
- **Aufträge** – Auftrags-Board (offen / in Arbeit / wartet / erledigt) mit Fortschritt
- **Angebote** – Angebots-PDFs erstellen, Verlauf, duplizieren, löschen
- **Pakete** – Leistungen & Standardpreise verwalten
- **Telefon** – editierbares Cold-Call-Skript + Notizen zu jedem Anruf

Design im Lumio-Look: dunkel, Glas-Panels, dezenter Glow, sanfte Animationen.

> ⚠️ **Rechtlicher Hinweis (Angebote):** Pflichtangaben (Anschrift, Steuerhinweis,
> Zahlungsbedingungen, Impressum) in `src/lib/lumio.ts` sind **Platzhalter** und
> müssen vor echter Nutzung von Lumio final geprüft werden.

---

## Technik

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Prisma + SQLite ·
NextAuth (Login) · @react-pdf/renderer (PDF) · Google APIs (Gmail/Kalender) ·
Anthropic/Claude (KI) · framer-motion (Animationen).

---

## Einrichtung (einmalig)

Voraussetzung: **Node.js 20.9+**.

```bash
cd lumio-angebots-tool
npm install
npx prisma migrate dev     # Datenbank anlegen
npm run db:seed            # Login-Konten + Beispiel-Pakete
```

### Login

| Benutzer | Passwort           | Google-Konto              |
| -------- | ------------------ | -------------------------- |
| `miko`   | `lumio-miko-2026`  | miko@lumio-agency.de       |
| `nevio`  | `lumio-nevio-2026` | nevio@lumio-agency.de      |
| `info`   | `lumio-info-2026`  | info@lumio-agency.de       |

Jeder Benutzer verbindet unter „E-Mails"/„Kalender" sein **eigenes** Google-Konto
(„Google verbinden"). Dadurch sieht z. B. `miko` sein persönliches Postfach,
`info` das gemeinsame Team-Postfach.

> 🔐 Start-Passwörter bitte ändern (siehe unten „Passwörter“).

### Starten

```bash
npm run dev
```

Öffnen: **http://localhost:3000**

---

## Echte Daten anbinden (Google + KI)

Das Dashboard läuft sofort mit **Beispiel-Daten**. Für echte Gmail-, Kalender-
und KI-Funktionen die Zugänge gemäß **[SETUP.md](SETUP.md)** in `.env` eintragen
und den Server neu starten. Solange nichts hinterlegt ist, erscheinen im
Kalender/E-Mail-Bereich Beispiel-Daten und ein Hinweis „Google verbinden“.

---

## Anpassen

| Was                                   | Wo                          |
| ------------------------------------- | --------------------------- |
| Absenderdaten, Rechtstexte (Angebote) | `src/lib/lumio.ts`          |
| Akzentfarbe & Theme                   | `src/app/globals.css`       |
| Beispiel-Daten (Kalender/Mails)       | `src/lib/demo-data.ts`      |
| Logo im Angebots-PDF                  | Datei `public/logo.png`     |

### Passwörter

Eigene Start-Passwörter beim Seed setzen:

```powershell
$env:SEED_MIKO_PASSWORD="…"; $env:SEED_NEVIO_PASSWORD="…"; npm run db:seed
```

`db:seed` überschreibt bestehende Konten nicht. Zum Zurücksetzen den Nutzer
vorher löschen (z. B. mit `npm run db:studio`).

---

## Deployment (später)

> ⚠️ Das normale IONOS-Webhosting-Paket (worüber die Lumio-Website läuft) und
> auch **IONOS Deploy Now** unterstützen **kein** Next.js-Server-Side-Rendering
> (nur statischen Export) – dieses Dashboard braucht aber einen dauerhaft
> laufenden Node.js-Server + Datenbank. Es kann daher **nicht** über den
> gleichen Weg wie die Website gehostet werden.

- **IONOS VPS / Cloud Server** (separates Abo mit SSH-Root-Zugriff): SQLite-
  Datei bleibt liegen; Node.js selbst installieren, `npm run build` + `npm run
  start` dauerhaft laufen lassen (z. B. via `pm2`), eigene Subdomain (z. B.
  `tool.lumio.de`).
- **Vercel:** automatisches Deployment bei jedem GitHub-Push, aber SQLite ist
  dort nicht dauerhaft speicherbar → für Produktion gehostete DB nutzen (z. B.
  Postgres bei Neon/Supabase).
- In Produktion: neues `AUTH_SECRET`, Produktions-Redirect-URI bei Google,
  echte Keys in den Umgebungsvariablen.
