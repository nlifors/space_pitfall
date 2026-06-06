# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Space Pitfall — a space-themed *Pitfall!*-style platformer in **vanilla
JavaScript + HTML5 Canvas**. Zero dependencies, zero build step, no framework.
Source is plain ES modules loaded directly by the browser.

## Running

ES modules cannot be loaded over `file://` (browser CORS blocks it), so the game
must be served over HTTP:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no package.json, bundler, linter, or test runner. To syntax-check a
module without a browser:

```bash
node --check --input-type=module < js/game.js
```

## Architecture

The game is a single `requestAnimationFrame` loop driving a small state machine,
with rendering handled immediate-mode on one 800×450 canvas. Data flows
one-directionally each frame: **input → update → collision/scoring → render**.

- `js/main.js` — bootstrap. Wires the DOM overlay (`#overlay`) to the `Game`
  and starts it. The overlay's `.logo` element is reused as the title/result
  text on the title, win and game-over screens.
- `js/game.js` — the orchestrator and the only stateful "manager". Owns the
  loop, the `STATE` machine (`title → playing ⇄ paused / respawn → win/gameover`),
  screen transitions, the collision pass, scoring, lives, the countdown timer,
  the starfield, and HUD/overlay chrome. **All game-level decisions live here**
  — entities never decide that a life is lost or score is awarded.
- `js/player.js` — the astronaut entity. Owns movement, gravity, jumping (with
  coyote-time), and the tether-swing sub-state machine
  (`ground / air / swing`). It reports falling into a chasm via the
  `fellIntoChasm` flag but does **not** mutate game state; the `Game` reads that
  flag and calls `loseLife()`.
- `js/entities.js` — every hazard/pickup/swing object: `Chasm`, `Crawler`,
  `Asteroid`, `Laser`, `Crystal`, `Tether`. Each exposes a uniform
  `update()` / `draw(ctx)` interface and a `kind` string
  (`"hazard"` | `"pickup"` | `"tether"`) that the collision pass dispatches on.
  `Chasm` is special: it's not a touch-hazard — it represents *absence* of floor
  and is consulted by `Screen.isSolidAt()`.
- `js/level.js` — the world model. `Screen` holds one screen's chasms/entities
  and answers `isSolidAt(worldX)`. `buildLevel()` generates an ordered list of
  screens using a seeded PRNG (`mulberry32`) so runs vary but the difficulty
  curve (0→1 across sectors) is deterministic per sector index.
- `js/audio.js` — all sound, fully **synthesized at runtime** via Web Audio
  (no asset files). One master gain feeds the speakers; muting ramps it to zero.
  SFX are one-shot oscillator/noise voices; the background loop is a lookahead
  scheduler that queues notes slightly ahead of the audio clock. Browsers
  require a user gesture before audio starts, so `unlock()` is called from the
  Launch-button click (and `Game.start`).
- `js/particles.js` — lightweight shared particle pool (jet exhaust, pickup
  sparkle, death burst). Pure visual; driven by the `Game`'s update/draw.
- `js/constants.js` — **all tuning lives here** (physics, speeds, scoring,
  palette). Change game feel from this file rather than editing entity logic.
- `js/input.js` — keyboard layer. Maps `KeyboardEvent.code` to semantic actions
  and distinguishes held state (`isDown`) from edge-triggered taps
  (`wasPressed`). The loop **must** call `input.endFrame()` once per frame to
  clear the press buffer, or taps repeat.

## Conventions worth keeping

- **The world is screen-based, not a scrolling camera.** The world is exactly
  one screen wide; advancing right past `VIEW.WIDTH` swaps in the next `Screen`
  and re-places the player at the opposite edge (see `Game.advanceScreen`).
  Coordinates are screen-local, not world-global.
- **Entities are dumb; the Game is smart.** Keep collision *intent* on entities
  (the `kind` field + a `hits(box)` test) but keep collision *consequences*
  (life loss, scoring, removal) in `Game.step()`.
- **Tether physics** is a damped pendulum simulated in `Tether` (angle/velocity
  only); the `Player` rides the rope end and converts angular velocity to a
  linear launch on release. Tune via `TETHER` in constants.
- Pickups are removed by setting `collected = true` and letting `Game.step()`
  filter them out — don't splice entity arrays mid-iteration.
- **Player → Game events use one-frame flags, not callbacks.** The Player raises
  `fellIntoChasm` / `justJumped` / `justGrabbed` / `justReleased`; `Game.step()`
  reads and clears them (to fire sounds/effects). Keep new player events in this
  shape so the Player stays unaware of audio/scoring.
