# Dashboard komplett über IONOS hosten (VPS / Cloud Server)

Diese Anleitung stellt das Lumio-Dashboard **vollständig bei IONOS** live, unter
`dashboard.lumio-agency.de`, mit Login und HTTPS. Beide Geschäftsführer greifen
dann über **einen** Server auf **dieselben Daten** zu.

---

## ⚠️ Erst lesen: Was ihr dafür braucht

Euer bestehendes **Webspace Hosting reicht NICHT** (es kann keinen Node-Server
laufen lassen – deshalb läuft dort nur die Website `lumio-agency.de`). Für das
Dashboard braucht ihr bei IONOS zusätzlich einen:

> **IONOS VPS (Virtual Server) bzw. Cloud Server** mit **Ubuntu** (Linux).

Das ist ein eigener kleiner Server, den man selbst einrichtet. Ein kleiner Tarif
(z. B. 2 CPU / 2 GB RAM) genügt für euch locker.

**Gute Nachricht zur Datenbank:** Auf einem VPS bleibt die Festplatte dauerhaft
erhalten. Deshalb kann die App **die vorhandene SQLite-Datenbank behalten** – für
zwei Nutzer mit wenig Datenvolumen völlig ausreichend. Es sind **keine**
Datenbank-Umbauten nötig. (Später jederzeit auf PostgreSQL aufrüstbar.)

**Voraussetzung:** Der Code liegt in einem (privaten) **GitHub-Repo** – siehe
`GITHUB.md`. Der Server holt sich den Code von dort. Das ist auch euer
„Push → Update"-Mechanismus (siehe Schritt J).

---

## A · VPS bei IONOS bestellen
1. Im IONOS-Konto einen **VPS / Cloud Server** hinzufügen.
2. Betriebssystem: **Ubuntu 24.04 LTS** wählen.
3. Nach der Bestellung notieren: **IP-Adresse** des Servers und das
   **Root-Passwort** (bzw. SSH-Zugang).

## B · Subdomain auf den Server zeigen lassen
1. Im IONOS-Konto → **Domains** → `lumio-agency.de` → **DNS**.
2. Neuen Eintrag anlegen:
   - Typ: **A**
   - Name/Host: **dashboard**
   - Wert/Ziel: die **IP-Adresse** des VPS
3. Speichern. (Kann bis zu ~1 Std. dauern, bis es überall aktiv ist.)
   → `dashboard.lumio-agency.de` zeigt danach auf euren Server.

## C · Mit dem Server verbinden (SSH)
Auf deinem Windows-PC in **PowerShell**:
```powershell
ssh root@DEINE_SERVER_IP
```
Beim ersten Mal mit „yes" bestätigen und das Passwort eingeben.
(Ab hier tippst du Befehle **auf dem Server**.)

## D · Grundausstattung installieren
```bash
# System aktualisieren
apt update && apt upgrade -y

# Node.js 20 (LTS) einrichten
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx build-essential

# Prozess-Manager (hält die App am Laufen) + HTTPS-Werkzeug
npm install -g pm2
apt install -y certbot python3-certbot-nginx
```

## E · Projekt auf den Server holen
```bash
cd /var/www 2>/dev/null || (mkdir -p /var/www && cd /var/www)
cd /var/www
# privates Repo klonen (GitHub fragt nach Nutzername + Token, siehe Hinweis unten)
git clone https://github.com/DEIN-KONTO/lumio-dashboard.git dashboard
cd dashboard
```
> Für private Repos verlangt GitHub statt des Passworts einen **Personal Access
> Token** (github.com → Settings → Developer settings → Tokens). Einmalig anlegen
> und beim `git clone` als Passwort eingeben.

## F · Einrichten & Produktions-Zugangsdaten
```bash
npm install
```
Dann die Datei `.env` anlegen:
```bash
nano .env
```
Inhalt (Werte anpassen!):
```env
DATABASE_URL="file:./prod.db"
AUTH_SECRET="HIER_EINEN_LANGEN_ZUFALLSWERT"
AUTH_TRUST_HOST=true
AUTH_URL="https://dashboard.lumio-agency.de"

# Google (aus SETUP.md) – Redirect-URI MUSS die Live-Adresse sein:
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="https://dashboard.lumio-agency.de/api/google/callback"

ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL=""
```
Speichern in nano: **Strg+O**, **Enter**, **Strg+X**.

Einen starken `AUTH_SECRET` erzeugen (Ausgabe in die `.env` kopieren):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Datenbank anlegen, Konten/Beispiele erzeugen, App bauen:
```bash
npx prisma migrate deploy
npm run db:seed
npm run build
```

## G · App dauerhaft laufen lassen (PM2)
```bash
pm2 start "npm run start" --name lumio
pm2 save
pm2 startup   # den angezeigten Befehl kopieren, einfügen, ausführen
```
Die App läuft jetzt intern auf Port 3000.

## H · Öffentlich erreichbar machen + HTTPS
Nginx als „Vermittler" einrichten:
```bash
nano /etc/nginx/sites-available/dashboard
```
Inhalt:
```nginx
server {
    server_name dashboard.lumio-agency.de;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Aktivieren + HTTPS-Zertifikat holen:
```bash
ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d dashboard.lumio-agency.de
```
Certbot richtet automatisch HTTPS ein. Danach ist das Dashboard erreichbar unter:
**https://dashboard.lumio-agency.de** 🎉

## I · Google-Redirect-URI ergänzen
Falls ihr Gmail/Kalender nutzt: In der Google Cloud Console (siehe `SETUP.md`)
die Redirect-URI **`https://dashboard.lumio-agency.de/api/google/callback`**
zusätzlich eintragen.

---

## J · Updates einspielen (euer „Push → Update")
Wenn wir am Code etwas ändern und ihr es hochladet (Push nach GitHub), holt der
Server die neue Version so:
```bash
cd /var/www/dashboard
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart lumio
```
Diese fünf Zeilen kann man später in ein kleines Skript (`update.sh`) packen oder
sogar automatisieren – für den Anfang reicht: einmal einloggen, Skript ausführen.

---

## K · Sicherheit (das „hacking-sichere" Backend)
```bash
# Firewall: nur Web + SSH erlauben
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```
Weitere Grundregeln:
- **System aktuell halten:** regelmäßig `apt update && apt upgrade -y`.
- **Starke Passwörter** für die Konten (Seed-Passwörter ändern!) und ein starkes
  `AUTH_SECRET` (siehe Schritt F).
- **SSH absichern:** später auf SSH-Schlüssel statt Passwort umstellen, optional
  `fail2ban` installieren.
- **`.env` bleibt geheim** und liegt nur auf dem Server – nie ins Repo.
- HTTPS ist durch Certbot aktiv (Zertifikat erneuert sich automatisch).

> 100 % „unhackbar" gibt es nicht. Mit diesen Schritten seid ihr aber auf einem
> soliden, üblichen Sicherheitsstand für ein internes Tool.

---

## Kurz-Übersicht
| Teil | Wo |
|---|---|
| Website `lumio-agency.de` | IONOS Webspace (unverändert) |
| Dashboard `dashboard.lumio-agency.de` | IONOS VPS (diese Anleitung) |
| Daten | SQLite-Datei **auf dem VPS** – für beide gemeinsam |
| Code | privates GitHub-Repo (`GITHUB.md`) |
