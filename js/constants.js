// Central tuning knobs for the whole game. Keeping every magic number here
// means level feel can be tweaked without hunting through entity logic.

export const VIEW = {
  WIDTH: 800,
  HEIGHT: 450,
};

// The ground/surface the astronaut runs along. Anything below FLOOR_Y that is
// not solid ground is a chasm (instant death = lose a life).
// Two stacked play layers, like the original Pitfall: the surface up top and an
// underground tunnel below it. Vertical bands (y grows downward):
//   sky/space   0 .. FLOOR_Y
//   surface slab    FLOOR_Y .. TUNNEL_CEIL   (the ground you run on)
//   tunnel cavity   TUNNEL_CEIL .. TUNNEL_FLOOR_Y  (the underground you walk in)
//   bedrock         TUNNEL_FLOOR_Y .. VIEW.HEIGHT
export const WORLD = {
  FLOOR_Y: 330,         // top of the surface (where the astronaut stands)
  SURFACE_H: 30,        // thickness of the surface slab
  TUNNEL_CEIL: 360,     // FLOOR_Y + SURFACE_H — underside of the slab
  TUNNEL_FLOOR_Y: 420,  // where the astronaut stands in the tunnel
  GRAVITY: 0.48,        // a touch floatier = more airtime to clear gaps
  TERMINAL_VY: 14,
};

export const PLAYER = {
  W: 22,
  H: 34,
  RUN_SPEED: 3.9,     // more ground speed to dodge / build swing distance
  JUMP_VY: -12.6,     // higher jump to clear chasms comfortably
  JUMP_CUT_VY: -4.5,  // releasing jump mid-rise trims upward speed to this (hop)
  COYOTE_FRAMES: 10,  // generous grace to still jump after leaving an edge
  CLIMB_SPEED: 2.6,   // vertical speed when climbing a ladder between layers
  START_LIVES: 5,
};

// Pendulum "energy tether" the player swings across wide chasms with.
export const TETHER = {
  LENGTH: 120,
  GRAVITY: 0.0045,    // angular gravity constant (g/L baked in)
  DAMPING: 0.999,
  GRAB_RADIUS: 40,    // forgiving grab so the swing isn't pixel-perfect
  RELEASE_BOOST: 1.15,
};

export const SCORE = {
  CRYSTAL: 1000,
  LEVEL_CLEAR: 5000,
  TIME_BONUS_PER_SEC: 25,
};

export const GAME = {
  TIME_LIMIT: 180,    // seconds to clear all five hand-authored sectors
  RESPAWN_INVULN: 110, // frames of invulnerability + blink after respawn
};

// Named palette so render code reads intention, not hex codes.
export const COLORS = {
  surface: "#1b2750",
  surfaceTop: "#2f86c9",
  chasm: "#02030a",
  tunnelBg: "#080a14",    // underground cavity interior
  bedrock: "#161d33",     // tunnel floor / slab underside
  bedrockTop: "#27325c",  // highlight line on the tunnel floor
  ladder: "#9aa6d6",
  spike: "#d05c74",       // tunnel spike hazard
  player: "#ffd166",
  playerSuit: "#e9efff",
  suitShadow: "#b9c3df",  // shaded suit parts (far leg/arm) for depth
  pack: "#46518f",        // jetpack body
  packTrim: "#cdd6ff",    // jetpack light border/bands (high contrast on any bg)
  flame: "#ff8a3c",       // jetpack thrust (outer)
  flameCore: "#ffe066",   // jetpack thrust (core)
  visor: "#43e0ff",
  crystal: "#ff5fa2",
  crawler: "#7af5c0",
  asteroid: "#9aa7c7",
  tether: "#43e0ff",
  laser: "#ff3b3b",
  hud: "#cfe3ff",
};
