# bot

Discord-Bot mit [discord.js](https://discord.js.org) und [Bun](https://bun.com).

## Setup

```bash
cp .env.example .env   # DISCORD_TOKEN, CLIENT_ID (und optional GUILD_ID) eintragen
bun run deploy         # Slash-Commands bei Discord registrieren
bun run dev            # Bot mit Auto-Reload starten
```

Token und Client-ID gibt es im [Discord Developer Portal](https://discord.com/developers/applications)
(Application → Bot → Reset Token, bzw. General Information → Application ID).

## Neuen Command anlegen

Datei unter `src/commands/<kategorie>/` erstellen, die
`{ data, execute } satisfies Command` als `export default` exportiert, dann `bun run deploy`.
Events liegen je eine Datei unter `src/events/`.
