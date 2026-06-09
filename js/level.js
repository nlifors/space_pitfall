// Screen-based level model, in the spirit of the original Pitfall: the world is
// a sequence of fixed-width screens. The player advances right; reaching the
// right edge swaps in the next screen. Each screen owns its own hazards,
// pickups, chasms and tethers.

import { VIEW, WORLD, COLORS } from "./constants.js";
import { Chasm, Crawler, Asteroid, Laser, Crystal, Tether, Ladder, Spikes } from "./entities.js";

export class Screen {
  constructor(def) {
    this.name = def.name || "";
    this.chasms = def.chasms || [];
    this.entities = def.entities || [];
    this.tethers = this.entities.filter((e) => e.kind === "tether");
    this.ladders = this.entities.filter((e) => e.kind === "ladder");
  }

  update() {
    for (const e of this.entities) if (e.update) e.update();
  }

  // True when world-x sits over solid surface (not a chasm and within bounds).
  // Only meaningful for the surface layer; the tunnel floor is always solid.
  isSolidAt(worldX) {
    if (worldX < 0 || worldX > VIEW.WIDTH) return false;
    for (const c of this.chasms) if (c.contains(worldX)) return false;
    return true;
  }

  draw(ctx) {
    const W = VIEW.WIDTH;
    const { FLOOR_Y, SURFACE_H, TUNNEL_CEIL, TUNNEL_FLOOR_Y } = WORLD;

    // Underground cavity behind the slab.
    ctx.fillStyle = COLORS.tunnelBg;
    ctx.fillRect(0, TUNNEL_CEIL, W, TUNNEL_FLOOR_Y - TUNNEL_CEIL);
    // Bedrock floor of the tunnel.
    ctx.fillStyle = COLORS.bedrock;
    ctx.fillRect(0, TUNNEL_FLOOR_Y, W, VIEW.HEIGHT - TUNNEL_FLOOR_Y);
    ctx.fillStyle = COLORS.bedrockTop;
    ctx.fillRect(0, TUNNEL_FLOOR_Y, W, 3);

    // Surface slab + its lit top edge + shaded underside (the tunnel ceiling).
    ctx.fillStyle = COLORS.surface;
    ctx.fillRect(0, FLOOR_Y, W, SURFACE_H);
    ctx.fillStyle = COLORS.surfaceTop;
    ctx.fillRect(0, FLOOR_Y, W, 4);
    ctx.fillStyle = COLORS.bedrock;
    ctx.fillRect(0, TUNNEL_CEIL - 2, W, 2);

    // Carve chasms (open the slab to the tunnel), then ladders/hazards/pickups.
    for (const c of this.chasms) c.draw(ctx);
    for (const e of this.entities) e.draw(ctx);
  }
}

// A crystal that lives in the tunnel layer (so it only counts when collected
// from underground). Stands just above the tunnel floor.
function tunnelCrystal(x) {
  const c = new Crystal(x, WORLD.TUNNEL_FLOOR_Y - 30);
  c.layer = "tunnel";
  return c;
}

// ---------------------------------------------------------------------------
// Hand-authored campaign — five themed sectors of rising difficulty. Each is a
// single 800-wide screen with a surface and an underground tunnel. Crystals are
// the treasures (◆); some hide in the tunnel as a risk/reward for braving the
// spikes. See the "map" in the README for an overview.
//
// Coordinate cheat-sheet: surface stand y≈296, on-ground crystal y≈290, a
// jump-height crystal y≈215, tunnel crystal y≈390 (handled by tunnelCrystal).
// ---------------------------------------------------------------------------
const LEVELS = [
  // 1 — LANDING ZONE: gentle intro. One slow crawler, a free tunnel crystal.
  () => new Screen({
    name: "LANDING ZONE",
    chasms: [],
    entities: [
      new Crystal(120, 290),
      new Crystal(450, 215),
      new Crawler(360, 320, 520, 0.9),
      new Ladder(660),
      new Spikes(470, 2),
      tunnelCrystal(240),
    ],
  }),

  // 2 — THE RIFT: a wide chasm. Swing the tether for the floating crystal, or
  // fall in and pick your way past the spikes below.
  () => new Screen({
    name: "THE RIFT",
    chasms: [new Chasm(320, 150)],
    entities: [
      new Tether(395, 60),
      new Crystal(386, 200),   // floating over the gap
      new Crystal(700, 290),
      new Ladder(140),
      new Ladder(700),
      new Spikes(430, 2),      // under the right half of the chasm
      tunnelCrystal(560),
    ],
  }),

  // 3 — ASTEROID RUN: two rolling asteroids up top; the tunnel is a spiky but
  // treasure-rich bypass.
  () => new Screen({
    name: "ASTEROID RUN",
    chasms: [],
    entities: [
      new Asteroid(VIEW.WIDTH, 2.4, VIEW.WIDTH + 40),
      new Asteroid(VIEW.WIDTH, 2.0, VIEW.WIDTH + 320),
      new Crystal(400, 215),
      new Ladder(120),
      new Ladder(700),
      new Spikes(290, 3),
      new Spikes(540, 2),
      tunnelCrystal(410),
      tunnelCrystal(630),
    ],
  }),

  // 4 — LASER GAUNTLET: three timed beams to thread, a chasm at the exit, and a
  // tunnel detour to skip the worst of it.
  () => new Screen({
    name: "LASER GAUNTLET",
    chasms: [new Chasm(690, 80)],
    entities: [
      new Laser(200, 50, 70, 0),
      new Laser(360, 50, 70, 30),
      new Laser(520, 50, 70, 60),
      new Crystal(280, 290),
      new Crystal(440, 290),
      new Ladder(120),
      new Ladder(620),
      new Spikes(330, 2),
      tunnelCrystal(250),
      tunnelCrystal(480),
    ],
  }),

  // 5 — THE GAUNTLET: everything at once — crawler, tether chasm, laser,
  // asteroid up top; a three-spike tunnel run below. Five treasures.
  () => new Screen({
    name: "THE GAUNTLET",
    chasms: [new Chasm(360, 150)],
    entities: [
      new Crystal(110, 290),
      new Crawler(140, 80, 300, 1.3),
      new Tether(435, 60),
      new Crystal(435, 200),   // floating over the gap
      new Laser(610, 50, 60, 0),
      new Asteroid(VIEW.WIDTH, 2.6, VIEW.WIDTH + 60),
      new Crystal(730, 215),
      new Ladder(70),
      new Ladder(730),
      new Spikes(210, 3),
      new Spikes(430, 2),
      new Spikes(580, 2),
      tunnelCrystal(320),
      tunnelCrystal(650),
    ],
  }),
];

// Build the campaign as an ordered list of fresh Screen instances (each run
// gets new entity objects so state like asteroid positions resets cleanly).
export function buildLevel() {
  return LEVELS.map((make) => make());
}
