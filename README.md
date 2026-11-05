# Bonsai Bot

Discord-Bot mit Web-Dashboard für einen einzelnen Discord-Server. Mitglieder melden sich mit ihrem Discord-Account an, verwalten eine gemeinsame Spiele-Wunschliste und steuern die Musik im Voice-Channel über die Website.

## Funktionen

- **Discord-Login:** Anmeldung per Discord, nur für Mitglieder des konfigurierten Servers
- **Dashboard:** Serverinfos, Mitgliederliste und täglicher Spielevorschlag aus der Wunschliste
- **Wunschliste:** Spiele per Steam- oder Instant-Gaming-Link hinzufügen, Preise werden alle 30 Minuten aktualisiert, Preissenkungen werden in einem Discord-Channel gemeldet
- **Bonsai FM:** Warteschlange mit YouTube-Links, dazu Beitreten, Verlassen, Abspielen, Stoppen und Überspringen über die Website
- **Slash-Commands:** `/ping` und `/link`

## Aufbau

| Pfad                  | Inhalt                                         |
| --------------------- | ---------------------------------------------- |
| `apps/web`            | Web-Dashboard (Next.js, React)                 |
| `apps/api`            | API (Elysia)                                   |
| `apps/bot`            | Discord-Bot (discord.js, lavalink-client)      |
| `packages/database`   | Prisma-Schema, Migrationen und Client (SQLite) |
| `packages/auth`       | Better-Auth-Konfiguration                      |
| `packages/api-client` | API-Client für das Web-Dashboard               |
| `packages/treaty`     | Eden-Treaty-Anbindung an die API               |
| `packages/logger`     | Gemeinsames Logging                            |

Für die Musikwiedergabe kommen zusätzlich Lavalink und yt-cipher als Docker-Container zum Einsatz.

## Voraussetzungen

- [Bun](https://bun.sh) 1.4.2
- Node.js 24 oder neuer
- Docker mit Docker Compose
- Eine Anwendung im [Discord Developer Portal](https://discord.com/developers/applications) mit Bot und OAuth2

## Lokale Entwicklung

1. Abhängigkeiten installieren:

   ```sh
   bun install
   ```

2. Die `.env.example` in diesen Ordnern jeweils nach `.env` kopieren und ausfüllen:
   - `apps/api`
   - `apps/bot`
   - `apps/web`
   - `packages/api-client`
   - `packages/database`

3. Prisma-Client erzeugen und Datenbank anlegen:

   ```sh
   bun run db:generate
   bun run db:migrate
   ```

4. Bot, Lavalink und yt-cipher in Docker starten:

   ```sh
   bun run docker:dev
   ```

5. Web-Dashboard und API starten:

   ```sh
   bun run dev
   ```

   Das Dashboard läuft auf `http://localhost:3000`, die API auf `http://localhost:3001`.

6. Slash-Commands einmalig oder nach Änderungen registrieren:

   ```sh
   cd apps/bot
   bun run deploy
   ```

## Produktion

1. `.env.example` im Projektordner nach `.env` kopieren und mit eigenen Werten und HTTPS-Adressen ausfüllen.

2. Stack bauen und starten:

   ```sh
   docker compose -f docker-compose-prod.yml up -d --build
   ```

3. Slash-Commands registrieren:

   ```sh
   docker compose -f docker-compose-prod.yml run --rm deploy-commands
   ```

Web-Dashboard und API sind standardmäßig nur lokal auf den Ports `3000` und `3001` erreichbar. Davor gehört ein Reverse Proxy mit HTTPS.

Falls YouTube die IP des Servers blockiert, lässt sich in der `.env` optional OAuth aktivieren. Die Variablen dafür stehen in der `.env.example`.

## Befehle

| Befehl                | Beschreibung                        |
| --------------------- | ----------------------------------- |
| `bun run dev`         | Web-Dashboard und API starten       |
| `bun run build`       | Alle Apps bauen                     |
| `bun run lint`        | Code mit oxlint prüfen              |
| `bun run format`      | Code mit oxfmt formatieren          |
| `bun run check-types` | Typen prüfen                        |
| `bun run db:generate` | Prisma-Client erzeugen              |
| `bun run db:migrate`  | Migrationen erstellen und anwenden  |
| `bun run db:studio`   | Prisma Studio öffnen                |
| `bun run docker:dev`  | Entwicklungs-Container starten      |
| `bun run docker:prod` | Produktions-Stack bauen und starten |

## Sicherheit

`.env`-Dateien und `*.db`-Dateien dürfen nicht committet werden, sie sind per `.gitignore` ausgeschlossen. Die lokale Datenbank enthält Sessions und Discord-Tokens.
