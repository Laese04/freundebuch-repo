# Freundebuch

Ein digitales Gästebuch für den NFC-Tag: Besucher tragen sich mit Name, Foto und Nachricht ein, alle Einträge sind auf der Seite sichtbar.

## Deployment (Vercel, kostenlos)

1. **GitHub-Repo erstellen**
   - Auf [github.com](https://github.com) einloggen (Account kostenlos erstellen falls nötig).
   - "New repository" → Name z. B. `freundebuch` → "Create repository".
   - Auf der leeren Repo-Seite auf "uploading an existing file" klicken und alle Dateien aus diesem Ordner hineinziehen (inkl. `api`-Ordner). Commit.

2. **Bei Vercel importieren**
   - Auf [vercel.com](https://vercel.com) mit dem GitHub-Account einloggen.
   - "Add New" → "Project" → das `freundebuch`-Repo auswählen → "Deploy" (keine Einstellungen nötig).

3. **Blob-Speicher für Fotos aktivieren**
   - Im Vercel-Projekt: Tab "Storage" → "Create Database" → "Blob" → Namen vergeben → erstellen.
   - Der Store wird automatisch mit dem Projekt verbunden (Umgebungsvariable `BLOB_READ_WRITE_TOKEN` wird gesetzt).
   - Danach im Tab "Deployments" das letzte Deployment neu deployen ("Redeploy"), damit die Variable greift.

4. **URL notieren**
   - Unter "Settings" → "Domains" steht die URL, z. B. `https://freundebuch-xyz.vercel.app`.

## NFC-Tag beschreiben

- App "NFC Tools" (Android/iOS, kostenlos) installieren.
- "Write" → "Add a record" → "URL/URI" → die Vercel-URL eintragen → auf den Tag schreiben (Tag an Telefon halten).

## Lokale Struktur

- `index.html`, `style.css`, `app.js` – Frontend (statisch)
- `api/entries.js` – Serverless-Funktion: `GET` listet Einträge, `POST` legt neue an
- Fotos und Einträge werden direkt in Vercel Blob gespeichert (kein separates Datenbank-Setup nötig)
