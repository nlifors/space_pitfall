// Screen-based level model, in the spirit of the original Pitfall: the world is
// a sequence of fixed-width screens. The player advances right; reaching the
// right edge swaps in the next screen. Each screen owns its own hazards,
// pickups, chasms and tethers.

import { VIEW, WORLD, COLORS } from "./constants.js";
import { Chasm, Crawler, Asteroid, Laser, Crystal, Tether } from "./entities.js";

export class Screen {
  constructor(def) {
    this.chasms = def.chasms || [];
    this.entities = def.entities || [];
    this.tethers = this.entities.filter((e) => e.kind === "tether");
  }

  update() {
    for (const e of this.entities) if (e.update) e.update();
  }

  // True when world-x sits over solid surface (not a chasm and within bounds).
  isSolidAt(worldX) {
    if (worldX < 0 || worldX > VIEW.WIDTH) return false;
    for (const c of this.chasms) if (c.contains(worldX)) return false;
    return true;
  }

  draw(ctx) {
    // Surface slab first, then carve the chasms over it.
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, WORLD.FLOOR_Y, VIEW.WIDTH, WORLD.FLOOR_H);
    ctx.fillStyle = COLORS.surfaceTop;
    ctx.fillRect(0, WORLD.FLOOR_Y, VIEW.WIDTH, 5);
    for (const c of this.chasms) c.draw(ctx);
    for (const e of this.entities) e.draw(ctx);
  }
}

// --- pseudo-random generator so a run is varied but the difficulty curve is
// controllable. Each screen is seeded by its index. ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build one themed screen. `difficulty` (0..1) scales hazard density/speed.
function buildScreen(index, difficulty) {
  const rng = mulberry32(index * 1337 + 7);
  const entities = [];
  const chasms = [];
  const floorTop = WORLD.FLOOR_Y - 30;

  // Always sprinkle one or two crystals to reward exploration.
  const crystalCount = 1 + (rng() > 0.5 ? 1 : 0);
  for (let i = 0; i < crystalCount; i++) {
    const cx = 160 + rng() * 480;
    const cy = rng() > 0.6 ? floorTop - 90 : floorTop - 10;
    entities.push(new Crystal(cx, cy));
  }

  // Pick a screen archetype.
  const roll = rng();
  if (roll < 0.34) {
    // Chasm crossing — narrow enough to jump, with a tether as a safety net.
    const gapW = 100 + difficulty * 55;
    const gapX = VIEW.WIDTH / 2 - gapW / 2 + (rng() - 0.5) * 60;
    chasms.push(new Chasm(gapX, gapW));
    entities.push(new Tether(gapX + gapW / 2, 60));
  } else if (roll < 0.6) {
    // Crawler patrol on open surface.
    const count = 1 + Math.round(difficulty * 1);
    for (let i = 0; i < count; i++) {
      const minX = 120 + i * 220;
      entities.push(new Crawler(minX + 40, minX, minX + 150, 0.8 + difficulty * 0.9));
    }
  } else if (roll < 0.8) {
    // Rolling asteroids barreling in from the right.
    const count = 1 + Math.round(difficulty * 1);
    for (let i = 0; i < count; i++) {
      entities.push(new Asteroid(VIEW.WIDTH, 1.6 + difficulty * 1.3, VIEW.WIDTH + i * 320));
    }
  } else {
    // Laser corridor — timed beams to dash between (longer "off" = bigger gaps).
    const count = 1 + Math.round(difficulty * 1.5);
    for (let i = 0; i < count; i++) {
      entities.push(new Laser(200 + i * 170, 50, 70, i * 40));
    }
  }

  return new Screen({ chasms, entities });
}

// Assemble the whole run as an ordered list of screens with a rising curve.
export function buildLevel(screenCount) {
  const screens = [];
  for (let i = 0; i < screenCount; i++) {
    const difficulty = i / Math.max(1, screenCount - 1); // 0..1
    screens.push(buildScreen(i, difficulty));
  }
  return screens;
}
