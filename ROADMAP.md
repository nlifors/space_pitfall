# Space Pitfall — Roadmap

Proposed enhancements, ordered roughly by impact-to-effort. Each item notes the
files it would touch so future work has a starting point. Nothing here is
committed scope — it's a menu, not a contract.

Legend: 🟢 small (an afternoon) · 🟡 medium (a day or two) · 🔴 large (multi-session)

---

## Gameplay

### Near-term

- 🟢 **Underground tunnel layer** — the signature *Pitfall!* mechanic. Add a
  second vertical band below the surface reachable via ladders at chasm edges.
  The tunnel is a shortcut (skip hazards) traded against scorpion-style enemies
  and no crystals. Touches `level.js` (a `Screen` gains an `underground` band),
  `player.js` (ladder climb sub-state), `constants.js` (a `TUNNEL_Y`).
- 🟢 **Oxygen meter** — a depleting air supply alongside the timer; refill at
  collectible O₂ canisters. Turns the clock into a managed resource rather than
  a hard wall. Touches `game.js` (HUD + drain), a new `OxygenTank` in
  `entities.js`.
- 🟢 **Variable jump height** — hold jump to go higher, tap for a hop. Improves
  feel a lot for little code. Touches `player.js` (cut `vy` on key release),
  `constants.js`.
- 🟡 **More hazard archetypes** — gravity wells (pull the player), moving
  platforms / drifting asteroid stepping-stones over chasms, homing drones,
  retracting-floor plates. Each is a new class in `entities.js` + a branch in
  `level.js`'s `buildScreen`.
- 🟡 **Checkpoints & lives rework** — respawn at the last cleared sector instead
  of the current screen start; consider a continue system. Touches `game.js`
  (`respawn`, `loseLife`).

### Mid-term

- 🟡 **Score multiplier / combo** — chaining crystals or hazard-dodges without
  taking damage builds a multiplier shown in the HUD. Touches `game.js`.
- 🟡 **Power-ups** — temporary jetpack (free flight), shield (absorb one hit),
  slow-mo. Touches `entities.js`, `player.js`, `game.js`.
- 🔴 **Hand-authored levels + editor** — move from purely procedural screens to
  a JSON level format that `level.js` can load, plus a simple in-browser editor.
  Enables designed difficulty curves and boss sectors. Touches `level.js`
  (parser), new `assets/levels/*.json`.
- 🔴 **Boss sectors** — a multi-phase encounter every N sectors. Touches
  `game.js` (new state), `entities.js` (boss entity).

---

## Graphics & Audio

### Near-term

- 🟢 **Sprite sheets for the astronaut** — replace the procedural rectangle suit
  with proper run/jump/swing animation frames. Touches `player.js` (draw),
  `assets/`. Keeps the current vector look as a fallback.
- 🟢 **Particle system** — jet exhaust, crystal-collect sparkles, asteroid
  impact debris, death burst. A small reusable `Particles` module consumed by
  `game.js` and entities.
- 🟢 **Parallax starfield** — split the current single starfield into 2–3 depth
  layers that drift at different rates on screen transitions for a sense of
  motion. Touches `game.js` (`makeStars`/`drawStars`).
- 🟢 **Screen-transition + screen-shake polish** — a quick wipe/slide between
  sectors and a shake on death/impact. Touches `game.js`.

### Mid-term

- 🟡 **Sound & music** — Web Audio API: jump, grab, collect, death SFX plus a
  looping ambient track. New `js/audio.js`, hooked from `game.js`/`player.js`.
  Respect a mute toggle in the HUD.
- 🟡 **Lighting & glow pass** — a soft bloom on lasers/crystals/tether via an
  offscreen canvas composite. Touches `game.js` render pipeline.
- 🟡 **Animated backgrounds per sector** — nebulae, distant planets, a passing
  comet; theme the palette by sector. Touches `level.js` (per-screen theme),
  `constants.js` (palettes), `game.js`.
- 🟡 **Responsive / fullscreen scaling** — scale the canvas to the viewport
  while preserving 16:9 and crisp pixels. Touches `index.html`, `style.css`,
  `main.js`.

---

## Technical & Polish

- 🟢 **Fixed-timestep loop** — current update is frame-coupled (assumes ~60fps);
  decouple update from render with an accumulator so physics is consistent on
  120Hz/144Hz displays. Touches `game.js` `loop`/`step`, `player.js`/entities
  (accept `dt`).
- 🟢 **Persistent high scores** — `localStorage` leaderboard on the title/result
  overlay. Touches `game.js`, `main.js`.
- 🟢 **Mobile / touch controls** — on-screen d-pad + jump/grab buttons. Touches
  `index.html`, `style.css`, `input.js`.
- 🟡 **Gamepad support** — map the Gamepad API to the same semantic actions in
  `input.js` (no other file should need to care).
- 🟡 **Settings panel** — volume, control remapping, difficulty. Touches
  `index.html`, `main.js`, `input.js`.
- 🟢 **Tooling** — add a `package.json` with a `dev` script (a static server)
  and an `npm run check` that runs `node --check --input-type=module` over
  `js/*.js`. Optional ESLint + Prettier config.

---

## Guiding principles

These keep the codebase coherent as features land (see `CLAUDE.md`):

1. **Entities stay dumb; the `Game` stays smart.** New hazards expose `kind` +
   `hits(box)`; consequences live in `Game.step()`.
2. **All tuning goes in `constants.js`**, including new palettes and physics.
3. **`input.js` is the only place that knows about hardware** — gamepad, touch,
   and keyboard all resolve to the same semantic actions.
4. Prefer **data-driven content** (JSON levels, sprite manifests) over more
   hardcoded branches in `buildScreen` as the content grows.
