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
    // One-frame event flags the Game reads to fire sound effects, then clears.
    this.justJumped = false;
    this.justGrabbed = false;
    this.justReleased = false;
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  // World position of the jetpack nozzle, kept in sync with draw()'s geometry so
  // the exhaust particles stream from the pack rather than the feet. (Ignores the
  // small running bob, which doesn't apply while airborne anyway.)
  get jetNozzle() {
    const cx = this.x + this.w / 2;
    const torsoW = 13;
    const torsoX = cx - torsoW / 2;
    const back = -this.facing;
    const packW = 8;
    const packX = back > 0 ? torsoX + torsoW - 1 : torsoX - packW + 1;
    const nozX = back > 0 ? packX + packW - 3 : packX + 1;
    const nozY = this.y + 11 - 1 + 16; // torsoY(=y+11) - 1 + packH(16)
    return { x: nozX + 1.5, y: nozY + 1 };
  }

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
      this.justJumped = true;
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
        this.justGrabbed = true;
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
    this.justReleased = true;
  }

  draw(ctx) {
    const { x, y, w, facing } = this;
    const cx = x + w / 2;
    const onGround = this.state === STATE.GROUND;
    const running = onGround && Math.abs(this.vx) > 0.1;
    const thrusting = this.state !== STATE.GROUND;
    const phase = this.runPhase;

    // A little vertical bounce on each running stride.
    const bob = running ? Math.abs(Math.sin(phase)) * 1.4 : 0;
    const top = y - bob;
    const back = -facing; // the jetpack rides on the astronaut's back

    ctx.save();
    ctx.lineCap = "round";

    // Body geometry (relative to the bobbed top).
    const torsoW = 13;
    const torsoX = cx - torsoW / 2;
    const torsoY = top + 11;
    const torsoH = 13;
    const hipY = torsoY + torsoH;
    const headCx = cx + facing * 1.5;
    const headCy = top + 7;
    const headR = 7.5;

    // ---------- Jetpack (drawn behind the body) ----------
    // A light border around the pack keeps it readable on any background — over
    // dark space and over the bright red laser beam alike.
    const packW = 8;
    const packH = 16;
    const packX = back > 0 ? torsoX + torsoW - 1 : torsoX - packW + 1;
    const packY = torsoY - 1;
    const nozX = back > 0 ? packX + packW - 3 : packX + 1; // nozzle on the back edge
    const nozY = packY + packH;

    // Thrust flame (under the pack) — flickers while airborne or swinging.
    if (thrusting) {
      const fl = 7 + Math.random() * 8;
      ctx.fillStyle = COLORS.flame;
      ctx.beginPath();
      ctx.moveTo(nozX - 1.5, nozY);
      ctx.lineTo(nozX + 4.5, nozY);
      ctx.lineTo(nozX + 1.5, nozY + fl);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = COLORS.flameCore;
      ctx.beginPath();
      ctx.moveTo(nozX, nozY);
      ctx.lineTo(nozX + 3, nozY);
      ctx.lineTo(nozX + 1.5, nozY + fl * 0.55);
      ctx.closePath();
      ctx.fill();
    }

    // Light border (also forms the tank cap poking above the shoulder).
    ctx.fillStyle = COLORS.packTrim;
    ctx.fillRect(packX - 1, packY - 3, packW + 2, packH + 4);
    // Body inset within the border.
    ctx.fillStyle = COLORS.pack;
    ctx.fillRect(packX, packY, packW, packH - 1);
    // Trim bands + nozzle.
    ctx.fillStyle = COLORS.packTrim;
    ctx.fillRect(packX, packY + 4, packW, 2);
    ctx.fillRect(packX, packY + packH - 5, packW, 2);
    ctx.fillRect(nozX, nozY, 3, 3);

    // ---------- Legs (run cycle: opposite swing, tucked while flying) ----------
    const stride = running ? Math.sin(phase) * 5 : 0;
    const tuck = thrusting ? 4 : 0;
    drawLimb(ctx, cx + 1, hipY, cx + 3 + stride, hipY + 8 - tuck - Math.max(0, stride) * 0.4,
             5, COLORS.playerSuit, COLORS.player);      // near leg
    drawLimb(ctx, cx - 1, hipY, cx - 3 - stride, hipY + 8 - tuck - Math.max(0, -stride) * 0.4,
             5, COLORS.suitShadow, COLORS.player);       // far leg (shaded)

    // ---------- Torso ----------
    ctx.fillStyle = COLORS.playerSuit;
    roundRect(ctx, torsoX, torsoY, torsoW, torsoH, 4);
    ctx.fill();
    // Chest control panel.
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(cx - 3, torsoY + 4, 6, 5);
    ctx.fillStyle = COLORS.visor;
    ctx.fillRect(cx - 2, torsoY + 5, 2, 3);

    // ---------- Front arm (swings opposite the near leg) ----------
    const armSwing = running ? -Math.sin(phase) * 4 : thrusting ? -3 : 1;
    drawLimb(ctx, cx + facing * 3, torsoY + 3, cx + facing * 4 + armSwing, torsoY + 11,
             4, COLORS.playerSuit, COLORS.player);

    // ---------- Helmet + visor ----------
    ctx.fillStyle = COLORS.playerSuit;
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.visor;
    ctx.beginPath();
    ctx.ellipse(headCx + facing * 1.5, headCy, headR - 2.5, headR - 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)"; // visor glint
    ctx.beginPath();
    ctx.arc(headCx + facing * 2.5, headCy - 2, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Small drawing helpers shared by the astronaut sprite.
// ---------------------------------------------------------------------------

// A thick rounded limb segment capped with a boot/glove at the far end.
function drawLimb(ctx, x1, y1, x2, y2, width, limbColor, capColor) {
  ctx.strokeStyle = limbColor;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.arc(x2, y2, width / 2 + 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Rounded-rect path (ctx.roundRect isn't universally available).
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
