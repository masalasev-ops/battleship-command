# ⚓ Battleship Command

> A stunning dark naval command-center Battleship game built with React, HTML5 Canvas, and the Web Audio API. Play against a smart AI or challenge a friend in local pass-and-play mode.

![Battleship Command](https://img.shields.io/badge/react-18-blue?logo=react) ![Vite](https://img.shields.io/badge/vite-5-purple?logo=vite) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎮 Gameplay

| Mode | Description |
|------|-------------|
| **1 Player vs AI** | Battle against an intelligent AI with 3 difficulty levels |
| **2 Players (Local)** | Pass-and-play with screen-peek protection between turns |

### Ship Fleet (Standard)

| Ship | Size |
|------|------|
| 🚢 Carrier | 5 cells |
| 🛳️ Battleship | 4 cells |
| 🛥️ Cruiser | 3 cells |
| 🐋 Submarine | 3 cells |
| ⛵ Destroyer | 2 cells |

---

## 🧠 AI Difficulty Levels

| Level | Strategy |
|-------|----------|
| **Easy** | Random unshot cells |
| **Medium** | Hunt-target pattern — parity scanning + directional pursuit after hits |
| **Hard** | Probability density map — evaluates all possible ship placements, picks the cell with maximum overlap |

---

## ✨ Features

### 🎨 Visual Effects (Canvas)
- Dark ocean gradient backgrounds with cyan-glowing grid lines
- Procedurally drawn explosion icons (star bursts with sparks)
- Miss ripple animations with expanding rings
- Sunk ship fragment effects (cells break apart, rotate, and sink)
- Rotating radar sweep overlay
- Crosshair cursor with outer ring on enemy cells
- Screen shake on hits
- Green/red placement preview with glow

### 🔊 Audio (Web Audio API — Synthesized)
- **Ocean waves ambient** — layered pink noise with LFO-modulated volume swells (plays during menu & ship placement)
- **Sonar ping** — ship placement confirmation
- **Cannon fire** — battle start and random fleet deployment
- **Hit explosion** — filtered noise burst + low rumble
- **Miss splash** — short bandpass-filtered noise blip
- **Sinking ship** — descending sawtooth wail + explosion
- **Victory fanfare** — ascending major chord arpeggio
- **Defeat dirge** — descending minor tones

*All sounds are synthesized in real-time — no audio files required.*

### 🎯 Ship Placement
- Click to select a ship, click the board to place it
- Right-click the board, press `R`, or click the rotation button to toggle orientation
- Green/red live preview as you hover over placement positions
- Random fleet placement button
- Click a placed ship to remove and reposition

### 📱 Responsive Design
- Desktop: side-by-side boards with sidebar panels
- Mobile: stacked boards with toggle between own/enemy views

### 🔒 2-Player Pass-and-Play
- Full-screen overlay between turns hides the board from the opponent
- "Ready" button to confirm handoff
- Independent ship placement for each player

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Udayan/battleship-command.git
cd battleship-command

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🏗️ Project Structure

```
battleship-command/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                          # React entry point
    ├── App.jsx                           # Root component, phase routing, ambient audio
    ├── App.css                           # App layout, button system, animations
    ├── index.css                         # Global dark theme CSS variables
    ├── context/
    │   └── GameContext.jsx               # useReducer state, 14 action types
    ├── logic/
    │   ├── constants.js                  # Grid size, ship definitions, cell status
    │   ├── shipPlacement.js              # Validation, placement, random fleet generation
    │   ├── attackResolver.js             # Hit/miss/sunk resolution, victory check
    │   └── ai.js                         # Easy/Medium/Hard AI opponents
    ├── components/
    │   ├── LandingScreen.jsx/css         # Mode selection, radar animation, difficulty
    │   ├── PlacementScreen.jsx/css       # Ship placement UI, pass-to-player overlay
    │   ├── ShipDock.jsx/css              # Ship cards, wireframe SVGs, rotate button
    │   ├── BoardCanvas.jsx/css           # Full-featured canvas renderer
    │   ├── BattleScreen.jsx/css          # Dual boards, AI timing, pass-and-play
    │   ├── TurnIndicator.jsx/css         # Current turn display
    │   ├── MessageLog.jsx/css            # Scrollable combat log
    │   ├── ShipHealth.jsx/css            # Fleet health bars
    │   ├── GameOverScreen.jsx/css        # Victory/defeat screen, stats, board reveal
    │   └── AudioManager.jsx/css          # Audio context provider, mute toggle
    └── hooks/
        └── useAudio.js                   # Web Audio API synthesizer, ambient waves
```

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Deep background | `#0A1929` |
| Panel background | `#0D2137` |
| Surface | `#132F4C` |
| Primary accent (cyan) | `#00E5FF` |
| Hit color (red) | `#FF3D57` |
| Victory (gold) | `#FFD54F` |
| Ship color (teal) | `#00BCD4` |
| Font | Courier New (monospace), Segoe UI (display) |

---

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev) | UI framework |
| [Vite 5](https://vitejs.dev) | Build tool |
| HTML5 Canvas API | Game board rendering, effects, animations |
| Web Audio API | Synthesized sound effects |
| CSS Modules / CSS Variables | Dark theme styling |
| `useReducer` + Context | State management |

**Zero external UI libraries** — every component is built from scratch.

---

## 🎮 Controls

| Action | Control |
|--------|---------|
| Select ship | Click ship card in dock |
| Rotate ship | Right-click board / press `R` / click ↻ Rotate button |
| Place ship | Click a cell on the board |
| Remove ship | Click a placed ship cell |
| Random placement | Click 🎲 Random Placement button |
| Attack enemy | Click a cell on the enemy board (battle phase) |
| Toggle mobile view | Click Enemy Waters / Your Fleet buttons |
| Toggle sound | Click 🔊/🔇 button (bottom-right corner) |
| Quit to menu | Click ✕ Quit (top-right corner) |

---

## 🧪 Game State Flow

```
landing  →  placement  →  battle  →  gameover
   │                        │            │
   │  mode select           │  attack    │  stats
   │  name input            │  AI turn   │  board reveal
   │  difficulty            │  pass-n-play│  play again
   └────────────────────────┴────────────┘
```

---

## 📄 License

MIT — feel free to use, modify, and share.

---

<p align="center">
  <i>Built entirely with ❤️ using Claude Code</i>
</p>
