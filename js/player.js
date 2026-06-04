// The astronaut. Owns movement, gravity, jumping, falling-into-chasm death,
// and the tether swing state machine. The Player does NOT decide when a life
// is lost from hazards — the Game does — but it DOES report when it has fallen
// into the void via `fellIntoChasm`.

import { PLAYER, WORLD, TETHER, COLORS } from "./constants.js";
import { input } from "./input.js";

const STATE = { GROUND: "ground", AIR: "air", SWING: "swing" };

export class Player {
  constructor() {
    this.w = PLAYER.W;
    this.h = PLAYER.H;
    this.reset(80, WORLD.FLOOR_Y - PLAYER.H);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.state = STATE.AIR;
    this.coyote = 0;
    this.tether = null;     // currently-held Tether, if swinging
    this.runPhase = 0;
    this.jumped = false;    // true while rising from a jump (for variable height)
    this.fellIntoChasm = false;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  // `onSolidGround(worldX)` returns false when the surface beneath worldX is a
  // chasm, true otherwise. Supplied by the Game from the active screen.
  update(onSolidGround, tethers) {
    if (this.state === STATE.SWING) {
      this.updateSwing();
    } else {
      this.updateRunJump(onSolidGround, tethers);
    }
  }

  updateRunJump(onSolidGround, tethers) {
    // ---- horizontal ----
    const left = input.isDown("left");
    const right = input.isDown("right");
    this.vx = 0;
    if (left) { this.vx = -PLAYER.RUN_SPEED; this.facing = -1; }
    if (right) { this.vx = PLAYER.RUN_SPEED; this.facing = 1; }
    this.x += this.vx;
    if (Math.abs(this.vx) > 0) this.runPhase += 0.25;

    // ---- gravity ----
    this.vy = Math.min(this.vy + WORLD.GRAVITY, WORLD.TERMINAL_VY);
    // Variable jump height: let go of jump while still rising fast -> short hop.
    if (this.jumped && !input.isDown("jump") && this.vy < PLAYER.JUMP_CUT_VY) {
      this.vy = PLAYER.JUMP_CUT_VY;
      this.jumped = false;
    }
    this.y += this.vy;

    // ---- ground / chasm resolution ----
    const feetX = this.centerX;
    const groundHere = onSolidGround(feetX);
    const feetY = this.y + this.h;

    if (groundHere && feetY >= WORLD.FLOOR_Y && this.vy >= 0) {
      this.y = WORLD.FLOOR_Y - this.h;
      this.vy = 0;
      this.state = STATE.GROUND;
      this.coyote = PLAYER.COYOTE_FRAMES;
      this.jumped = false;
    } else {
      this.state = STATE.AIR;
      if (this.coyote > 0) this.coyote--;
      // Fell past the floor line where there is no ground -> into the void.
      if (!groundHere && this.y > WORLD.FLOOR_Y + 30) {
        this.fellIntoChasm = true;
      }
    }

    // ---- jump (with coyote time) ----
    if (input.wasPressed("jump") && (this.state === STATE.GROUND || this.coyote > 0)) {
      this.vy = PLAYER.JUMP_VY;
      this.state = STATE.AIR;
      this.coyote = 0;
      this.jumped = true;
    }

    // ---- grab a tether ----
    if (input.wasPressed("grab")) this.tryGrab(tethers);
  }

  tryGrab(tethers) {
    for (const t of tethers) {
      const dx = this.centerX - t.endX;
      const dy = this.centerY - t.endY;
      if (Math.hypot(dx, dy) <= TETHER.GRAB_RADIUS) {
        this.tether = t;
        t.occupied = true;
        this.state = STATE.SWING;
        return;
      }
    }
  }

  updateSwing() {
    const t = this.tether;
    // Player rides the rope end.
    this.x = t.endX - this.w / 2;
    this.y = t.endY - this.h / 2;

    // Lean into the swing: holding a direction nudges angular velocity so the
    // player can pump the pendulum like a real swing.
    if (input.isDown("left")) t.vel -= 0.0008;
    if (input.isDown("right")) t.vel += 0.0008;

    if (input.wasPressed("jump") || input.wasPressed("grab")) this.release();
  }

  release() {
    const t = this.tether;
    // Convert angular velocity at the rope end into linear launch velocity.
    const tangential = t.vel * t.len;
    this.vx = Math.cos(t.angle) * tangential * 14 * TETHER.RELEASE_BOOST;
    this.vy = -Math.sin(t.angle) * tangential * 14 * TETHER.RELEASE_BOOST - 4;
    this.facing = this.vx >= 0 ? 1 : -1;
    t.occupied = false;
    this.tether = null;
    this.state = STATE.AIR;
  }

  draw(ctx) {
    const { x, y, w, h } = this;
    ctx.save();

    // Backpack jets flicker while airborne / swinging.
    if (this.state !== STATE.GROUND) {
      ctx.fillStyle = "rgba(67,224,255,0.7)";
      const flame = 4 + Math.random() * 5;
      ctx.fillRect(x + 4, y + h - 2, 5, flame);
      ctx.fillRect(x + w - 9, y + h - 2, 5, flame);
    }

    // Suit body
    ctx.fillStyle = COLORS.playerSuit;
    ctx.fillRect(x, y + 8, w, h - 8);

    // Legs (animate stride when running on the ground)
    ctx.fillStyle = "#c5cee6";
    const stride = this.state === STATE.GROUND ? Math.sin(this.runPhase) * 5 : 0;
    ctx.fillRect(x + 3, y + h - 8, 6, 8);
    ctx.fillRect(x + w - 9 + stride * 0.0, y + h - 8, 6, 8);

    // Helmet + visor
    ctx.fillStyle = COLORS.playerSuit;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.visor;
    const vx = this.facing > 0 ? x + w / 2 - 1 : x + w / 2 - 7;
    ctx.fillRect(vx, y + 4, 8, 6);

    // Chest accent
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(x + w / 2 - 3, y + 16, 6, 6);

    ctx.restore();
  }
}
