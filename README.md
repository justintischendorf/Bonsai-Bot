# Bonsai Bot

Discord-Bot mit Web-Dashboard für einen einzelnen Discord-Server. Mitglieder melden sich mit ihrem Discord-Account an, verwalten eine gemeinsame Spiele-Wunschliste, steuern die Musik im Voice-Channel über die Website und schauen zusammen YouTube-Videos.

## Funktionen

- **Discord-Login:** Anmeldung per Discord, nur für Mitglieder des konfigurierten Servers
- **Dashboard:** Serverinfos, Mitgliederliste und täglicher Spielevorschlag aus den bereits erschienenen Spielen der Wunschliste
- **Wunschliste:** Spiele per Link zu Steam, Instant Gaming oder dem PlayStation Store hinzufügen und angeben, ob Crossplay möglich ist. Titelbild und Preise werden automatisch übernommen und alle 30 Minuten aktualisiert, Preissenkungen werden in einem Discord-Channel gemeldet. Spiele lassen sich liken, beim Daumen sieht man mit Profilbild, wem das Spiel noch gefällt. Vor dem Entfernen eines Spiels fragt das Dashboard noch einmal nach
- **Bonsai FM:** Warteschlange mit YouTube-Links, dazu Beitreten, Verlassen, Abspielen, Stoppen und Überspringen über die Website
- **Bonsai Watch:** YouTube-Videos gemeinsam schauen. Videos kommen per Link auf eine Warteschlange, die sich per Drag-and-drop sortieren lässt. Abspielen, Pausieren und Springen im Video gelten für alle, die gerade zuschauen, und kommen über einen WebSocket sofort bei allen an. Am Ende eines Videos startet automatisch das nächste
- **Slash-Commands:** `/ping` und `/link`

## Aufbau

| Pfad                | Inhalt                                         |
| ------------------- | ---------------------------------------------- |
| `apps/web`          | Web-Dashboard (Next.js, React)                 |
| `apps/api`          | API (Elysia)                                   |
| `apps/bot`          | Discord-Bot (discord.js, lavalink-client)      |
| `packages/database` | Prisma-Schema, Migrationen und Client (SQLite) |
| `packages/auth`     | Better-Auth-Konfiguration                      |
| `packages/treaty`   | Eden-Treaty-Anbindung an die API               |
| `packages/logger`   | Gemeinsames Logging                            |

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

Das Deployment läuft über [Dokploy](https://dokploy.com) mit der Datei `docker-compose-prod.yml`.

1. In Dokploy einen Service vom Typ **Docker Compose** anlegen, nicht **Stack**. Als Compose Path `./docker-compose-prod.yml` eintragen und **Isolated Deployments** ausgeschaltet lassen.

2. Die Variablen aus der `.env.example` im Environment-Tab setzen. `WEB_SERVER_URL` und `BETTER_AUTH_URL` bekommen dieselbe Adresse, zum Beispiel `https://bonsai.example.com`.

3. Im Domains-Tab zwei Einträge mit derselben Domain anlegen:

   | Service | Pfad   | Port   | Strip Path |
   | ------- | ------ | ------ | ---------- |
   | `web`   | `/`    | `3000` | aus        |
   | `api`   | `/api` | `3001` | aus        |

4. Im Discord Developer Portal unter OAuth2 diese Redirect-URL eintragen: `https://bonsai.example.com/api/auth/callback/discord`

5. Deployen.

6. Slash-Commands einmalig und nach Änderungen auf dem Server registrieren, im Ordner mit der Compose-Datei und der `.env`:

   ```sh
   docker compose -f docker-compose-prod.yml run --rm deploy-commands
   ```

Web-Dashboard und API müssen unter derselben Domain laufen, weil das Web-Dashboard das Session-Cookie der API selbst prüft. Auf getrennten Subdomains käme das Cookie dort nicht an. Eine Änderung von `BETTER_AUTH_URL` erfordert einen neuen Build, weil die Adresse fest ins Frontend geschrieben wird.

Sichern lassen sich die Daten über die Volume Backups von Dokploy, betroffen sind die Volumes `database` und `bot-data`.

Neue Migrationen, zum Beispiel die Tabelle für die Warteschlange von Bonsai Watch, spielt der Service `migrate` bei jedem Deployment automatisch ein, bevor API und Web-Dashboard starten.

Bei Bonsai Watch liegt nur die Warteschlange in der Datenbank. Welches Video gerade läuft und an welcher Stelle, merkt sich die API im Arbeitsspeicher. Nach einem Neustart der API geht es mit dem nächsten Video der Warteschlange weiter. Titel und Kanal eines Videos holt die API über die oEmbed-Schnittstelle von YouTube, dafür ist kein API-Key nötig.

Änderungen an Wiedergabe und Warteschlange schickt die API über den WebSocket `/api/watch/live` an alle, die die Seite offen haben. Der Reverse Proxy muss deshalb WebSocket-Verbindungen zur API durchlassen, was Traefik in Dokploy standardmäßig tut.

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
