# Mythic World 🏛️

A 3D mythological adventure grounded in real historical scholarship. Walk through the Greek Underworld, Norse Yggdrasil, the Egyptian Duat, Celtic Tir na nÓg, and the Sumerian Cedar Forest. Speak with figures from ancient texts. Leave your legend permanently carved into the world for all future players to find.

**[▶ Play Now](https://YOUR-USERNAME.github.io/mythic-world)**

---

## Features

- **Real 3D world** built with Three.js — walk freely, look around
- **Curated NPC dialogue** drawn from real historical sources: the Odyssey, Prose Edda, Book of the Dead, Epic of Gilgamesh, Fenian Cycle. No AI used for NPC speech — the content is authored and safe
- **Five distinct realms**, each with unique architecture and atmosphere
- **Permanent player legacies** — press P to write your deed into the world. A glowing stone appears that future players can find and read
- **Ancient lore stones** — pre-written inscriptions from real mythological scholarship

## Controls

| Key | Action |
|-----|--------|
| `WASD` | Move |
| `Mouse` | Look around (click to lock) |
| `E` | Interact with nearby NPC or stone |
| `L` | Open the Legends panel (all player deeds) |
| `P` | Write your own legend into the world |
| `Esc` | Exit dialogue / close panels |

## Historical Sources

All NPC dialogue and lore inscriptions are drawn from:

- **Greek**: Homer's *Odyssey* & *Iliad*, Virgil's *Aeneid*, Sophocles' *Antigone*, Ovid's *Metamorphoses*
- **Norse**: *Prose Edda* (Snorri Sturluson), *Poetic Edda*, *Hávamál*
- **Egyptian**: *Book of the Dead*, Pyramid Texts (~2400 BCE), Heliopolitan creation myth
- **Celtic**: *Fenian Cycle*, *Lebor na hUidre*, *Mabinogion*
- **Sumerian**: *Epic of Gilgamesh* (~2100 BCE), Inanna's Descent to the Underworld

## Setup

### Quick start (GitHub Pages)

1. **Fork or clone** this repository
2. Go to **Settings → Pages**
3. Under *Source*, select **GitHub Actions**
4. Push to `main` — the site deploys automatically via `.github/workflows/deploy.yml`
5. Your game will be live at `https://YOUR-USERNAME.github.io/mythic-world`

### Local development

No build step needed — it's pure HTML, CSS, and JavaScript.

```bash
git clone https://github.com/YOUR-USERNAME/mythic-world.git
cd mythic-world
# Open with any local server, e.g.:
npx serve .
# or
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

> **Note:** Open directly as a file (`file://`) won't work because browsers block ES modules and font loading from `file://`. Use a local server.

## Project Structure

```
mythic-world/
├── index.html              # Entry point
├── css/
│   └── style.css           # All styles
├── js/
│   ├── lore.js             # Mythological content, NPC dialogue trees, realm data
│   ├── storage.js          # Player legacy persistence (localStorage)
│   ├── world.js            # Three.js scene builder
│   ├── dialogue.js         # Dialogue system
│   └── main.js             # Game loop, input, legacy prompt
└── .github/
    └── workflows/
        └── deploy.yml      # Auto-deploy to GitHub Pages
```

## Adding Content

### New NPC
Add to the `npcs` array in `js/lore.js` inside any realm. Each NPC needs:
- `name` — display name
- `color` — Three.js hex color for the character mesh
- `lore` — shown in the lore panel when nearby (historical context)
- `pos` — `{ angle, dist }` position in the realm
- `dialogueTree` — branching dialogue (see existing examples)

### New Realm
Add a new key to the `REALMS` object in `js/lore.js`, then add a button in `index.html` and a `buildRealmEnvironment` case in `js/world.js`.

### New Memory Stone
Add to the `memorystones` array in any realm with `{ x, z, lore }`.

## Design Philosophy

**No AI for NPC dialogue.** Every word spoken by every character is hand-authored from real historical and mythological scholarship. This ensures:
- Players cannot manipulate NPCs into saying inappropriate things
- The content is accurate and educationally grounded
- The experience is consistent and purposeful

**AI is not used in this project at all.** The legacy system uses `localStorage` — entirely client-side.

## License

MIT — use, fork, expand freely.
