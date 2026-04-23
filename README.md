---
title: Ludoryn
emoji: 🎲
colorFrom: orange
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Catanja — 3D Catan in de browser

Multiplayer Catan met React Three Fiber, Socket.io en Next.js.

## Lokaal draaien

### Dev mode (langzaam — Three.js compileert lang)

```bash
npm run dev
```

Duurt de eerste keer enkele minuten. Port: `http://localhost:8080`

### Production mode (snel — gebruikt bestaande build)

```bash
# Eenmalig builden
npm run build

# Starten
npm start
# of direct:
NODE_ENV=production node server.js
```

Start in <1 seconde. Port: `http://localhost:8080`

> Dev mode (`npm run dev`) compileert Three.js/React Three Fiber bij elke start opnieuw en hangt minutenlang op ~100% CPU. Gebruik production mode voor lokaal testen.

## Omgevingsvariabelen

Maak een `.env.local` aan:

```env
DATABASE_URL=postgres://...   # optioneel — zonder DB draaien rooms enkel in-memory
PORT=8080                     # standaard 8080
```

Zonder `DATABASE_URL` werkt alles, maar scores worden niet opgeslagen.

## Structuur

```
src/
  app/
    /          → lobby (kamer aanmaken / joinen)
    /game      → het 3D spel
    /catalog   → component preview
    /scores    → leaderboard
    /api/      → API routes
  components/  → 3D board componenten (HexTile, Settlement3D, Road3D, ...)
  lib/         → gedeelde logica
server.js      → custom Node.js server (Next.js + Socket.io)
```

## Tech stack

- **Next.js 16** — framework
- **React Three Fiber** + **@react-three/rapier** — 3D physics
- **Socket.io** — real-time multiplayer
- **PostgreSQL** — leaderboard & sessies (optioneel)
- **Tailwind CSS 4** — styling
