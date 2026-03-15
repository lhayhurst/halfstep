# halfstep

A progressive web app for learning piano scales, melodies, and music theory. Works with MIDI keyboards or an on-screen piano — no install needed, fully offline.

**[Try it live](https://lhayhurst.github.io/halfstep/)**

## What's in it

### Scale Trainer
Drill all 12 major scales with ascending, descending, or up-and-down patterns. Three difficulty modes progress your learning:

- **Guided** — scale notes highlighted on the keyboard with labels
- **Shadow** — only the root note is marked
- **Blind** — keyboard hidden, pure ear and muscle memory

Any octave counts — play a G anywhere on the keyboard and it registers. Progressive mastery tracking (silver, gold, master) per scale shows your progress at a glance.

### Melody Mode
Guitar Hero-style falling notes on a 3D highway. Play famous melodies as notes drive toward you:

- Ode to Joy, Twinkle Twinkle, Mary Had a Little Lamb, Happy Birthday, Fur Elise, When the Saints
- Play any melody in any key (melodies are encoded as scale degrees)
- Scoring with streak multipliers and S/A/B/C/D ratings
- Speed control: Slow, Medium, Normal, Fast

### Circle of Fifths
Two ways to learn the circle:

- **Quiz** — play your way around the circle by finding each fifth on the piano
- **Play** — walk through all 12 keys, playing each scale. Clean rounds advance, mistakes retry.

Progress persists across sessions.

## Setup

No build step, no dependencies. Just static files.

```bash
# Run locally
make run          # serves on localhost:8080

# Run tests
make test         # 258 tests across 5 modules

# Validate
make build        # checks files + runs tests
```

## MIDI

Plug in a USB MIDI keyboard and select it from the dropdown in the header. Works in Chrome and Edge (Web MIDI API). The on-screen keyboard works in any browser.

## Architecture

Pure vanilla JS with no frameworks. All game logic lives in testable pure-function modules:

| Module | Purpose | Tests |
|--------|---------|-------|
| `scale-engine.js` | Scale theory, note mapping, mastery tracking | 99 |
| `training-session.js` | Scale trainer state machine (Free Play / Training / Round Complete) | 48 |
| `melody-data.js` | Melody library, scale-degree-to-MIDI resolution | 20 |
| `melody-engine.js` | Melody game state machine (tick, hit detection, scoring) | 44 |
| `circle-walk.js` | Circle of fifths walk + quiz state machine | 47 |

The UI layer in `index.html` is thin glue — it renders state and dispatches actions. Each module uses a pure reducer pattern: `(state, action) => newState`, fully deterministic and testable.

Piano samples from [piano-mp3](https://github.com/pffy/piano-mp3).

## PWA

Installs as a standalone app. Service worker caches everything for offline use. Three themes: Clean (light), Dark, and Warm.

## License

See [LICENSE](LICENSE).
