// Central tuning knobs for the whole game. Keeping every magic number here
// means level feel can be tweaked without hunting through entity logic.

export const VIEW = {
  WIDTH: 800,
  HEIGHT: 450,
};

// The ground/surface the astronaut runs along. Anything below FLOOR_Y that is
// not solid ground is a chasm (instant death = lose a life).
export const WORLD = {
  FLOOR_Y: 330,       // top of the surface platform
  FLOOR_H: 120,       // visual thickness of the surface
  GRAVITY: 0.48,      // a touch floatier = more airtime to clear gaps
  TERMINAL_VY: 14,
};

export const PLAYER = {
  W: 22,
  H: 34,
  RUN_SPEED: 3.9,     // more ground speed to dodge / build swing distance
  JUMP_VY: -12.6,     // higher jump to clear chasms comfortably
  COYOTE_FRAMES: 10,  // generous grace to still jump after leaving an edge
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
  TIME_LIMIT: 180,    // seconds to clear all screens
  SCREEN_COUNT: 8,    // procedurally themed screens per run
  RESPAWN_INVULN: 110, // frames of invulnerability + blink after respawn
};

// Named palette so render code reads intention, not hex codes.
export const COLORS = {
  surface: "#1b2750",
  surfaceTop: "#2f86c9",
  chasm: "#02030a",
  player: "#ffd166",
  playerSuit: "#e9efff",
  visor: "#43e0ff",
  crystal: "#ff5fa2",
  crawler: "#7af5c0",
  asteroid: "#9aa7c7",
  tether: "#43e0ff",
  laser: "#ff3b3b",
  hud: "#cfe3ff",
};
