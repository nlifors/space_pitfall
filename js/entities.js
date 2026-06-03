// Static + dynamic things that populate a screen. Every entity exposes a
// uniform interface: update(dt) and draw(ctx). Collision intent is expressed
// by `kind` so the game's collision pass can stay generic.
//
//   kind: "hazard"  -> touching it costs a life
//   kind: "pickup"  -> touching it scores and removes the entity
//   kind: "tether"  -> grab-able swing point (handled specially by Player)

import { WORLD, COLORS, TETHER } from "./constants.js";

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ---------------------------------------------------------------------------
// Chasm: a gap in the surface. Not a touch-hazard — the floor logic in Player
// reads chasms to decide whether the ground exists under its feet.
// ---------------------------------------------------------------------------
export class Chasm {
  constructor(x, w) {
    this.x = x;
    this.w = w;
  }
  contains(worldX) {
    return worldX > this.x && worldX < this.x + this.w;
  }
  draw(ctx) {
    ctx.fillStyle = COLORS.chasm;
    ctx.fillRect(this.x, WORLD.FLOOR_Y, this.w, WORLD.FLOOR_H);
    // faint plasma glow at the lip of the void
    ctx.fillStyle = "rgba(255, 95, 162, 0.18)";
    ctx.fillRect(this.x, WORLD.FLOOR_Y, this.w, 4);
  }
}

// ---------------------------------------------------------------------------
// Crawler: alien that paces back and forth between two x bounds on the surface.
// ---------------------------------------------------------------------------
export class Crawler {
  constructor(x, minX, maxX, speed = 1.1) {
    this.kind = "hazard";
    this.w = 30;
    this.h = 20;
    this.x = x;
    this.y = WORLD.FLOOR_Y - this.h;
    this.minX = minX;
    this.maxX = maxX;
    this.dir = 1;
    this.speed = speed;
    this.legPhase = 0;
  }
  update() {
    this.x += this.dir * this.speed;
    if (this.x <= this.minX) { this.x = this.minX; this.dir = 1; }
    if (this.x + this.w >= this.maxX) { this.x = this.maxX - this.w; this.dir = -1; }
    this.legPhase += 0.2;
  }
  hits(box) { return rectsOverlap(this, box); }
  draw(ctx) {
    ctx.fillStyle = COLORS.crawler;
    // body
    ctx.beginPath();
    ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // two glaring eyes facing travel direction
    ctx.fillStyle = "#05060f";
    const ex = this.dir > 0 ? this.x + this.w - 10 : this.x + 4;
    ctx.fillRect(ex, this.y + 5, 4, 4);
    ctx.fillRect(ex + (this.dir > 0 ? -7 : 7), this.y + 5, 4, 4);
    // skittering legs
    ctx.strokeStyle = COLORS.crawler;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const lx = this.x + this.w / 2 + i * 8;
      const sway = Math.sin(this.legPhase + i) * 3;
      ctx.beginPath();
      ctx.moveTo(lx, this.y + this.h - 2);
      ctx.lineTo(lx + sway, this.y + this.h + 6);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Asteroid: rolls leftward across the screen; respawns at the right edge so it
// behaves like the rolling-log hazard of the original game.
// ---------------------------------------------------------------------------
export class Asteroid {
  constructor(screenW, speed = 2.4, startX = null) {
    this.kind = "hazard";
    this.r = 14;
    this.w = this.r * 2;
    this.h = this.r * 2;
    this.screenW = screenW;
    this.speed = speed;
    this.x = startX ?? screenW + Math.random() * screenW;
    this.y = WORLD.FLOOR_Y - this.h;
    this.spin = 0;
  }
  update() {
    this.x -= this.speed;
    this.spin -= this.speed / this.r;
    if (this.x + this.w < -40) this.x = this.screenW + 40 + Math.random() * 120;
  }
  hits(box) { return rectsOverlap(this, box); }
  draw(ctx) {
    const cx = this.x + this.r;
    const cy = this.y + this.r;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.spin);
    ctx.fillStyle = COLORS.asteroid;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    // craters
    ctx.fillStyle = "#6b7796";
    ctx.beginPath();
    ctx.arc(-4, -3, 3, 0, Math.PI * 2);
    ctx.arc(5, 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Laser gate: a vertical beam that blinks on and off on a fixed cadence. Only
// hazardous while lit.
// ---------------------------------------------------------------------------
export class Laser {
  constructor(x, onFrames = 70, offFrames = 50, phase = 0) {
    this.kind = "hazard";
    this.x = x;
    this.w = 6;
    this.y = WORLD.FLOOR_Y - 110;
    this.h = 110;
    this.onFrames = onFrames;
    this.offFrames = offFrames;
    this.t = phase;
  }
  get isOn() {
    return this.t % (this.onFrames + this.offFrames) < this.onFrames;
  }
  update() { this.t++; }
  hits(box) { return this.isOn && rectsOverlap(this, box); }
  draw(ctx) {
    // emitter nodes always visible
    ctx.fillStyle = "#552b2b";
    ctx.fillRect(this.x - 3, this.y - 6, this.w + 6, 6);
    ctx.fillRect(this.x - 3, this.y + this.h, this.w + 6, 6);
    if (!this.isOn) return;
    ctx.fillStyle = COLORS.laser;
    ctx.shadowColor = COLORS.laser;
    ctx.shadowBlur = 12;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;
  }
}

// ---------------------------------------------------------------------------
// Crystal: collectible treasure.
// ---------------------------------------------------------------------------
export class Crystal {
  constructor(x, y) {
    this.kind = "pickup";
    this.w = 18;
    this.h = 24;
    this.x = x;
    this.y = y;
    this.bob = Math.random() * Math.PI * 2;
    this.collected = false;
  }
  update() { this.bob += 0.08; }
  hits(box) { return !this.collected && rectsOverlap(this, box); }
  draw(ctx) {
    const oy = Math.sin(this.bob) * 4;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2 + oy;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = COLORS.crystal;
    ctx.shadowColor = COLORS.crystal;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, -this.h / 2);
    ctx.lineTo(this.w / 2, -4);
    ctx.lineTo(0, this.h / 2);
    ctx.lineTo(-this.w / 2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-2, -this.h / 2 + 4, 3, this.h / 2);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Tether: a swing pivot anchored above a chasm. The Player attaches to the
// rope end; this class only owns the pendulum simulation + rendering.
// ---------------------------------------------------------------------------
export class Tether {
  constructor(pivotX, pivotY = 60) {
    this.kind = "tether";
    this.px = pivotX;
    this.py = pivotY;
    this.len = TETHER.LENGTH;
    this.angle = -0.6;        // radians from straight-down
    this.vel = 0;
    this.occupied = false;
  }
  get endX() { return this.px + Math.sin(this.angle) * this.len; }
  get endY() { return this.py + Math.cos(this.angle) * this.len; }
  update() {
    // pendulum: a'' = -(g/L) sin(a); TETHER.GRAVITY already folds in 1/L
    this.vel += -TETHER.GRAVITY * Math.sin(this.angle);
    this.vel *= TETHER.DAMPING;
    this.angle += this.vel;
  }
  draw(ctx) {
    ctx.strokeStyle = COLORS.tether;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.tether;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.px, this.py);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // anchor + handle
    ctx.fillStyle = COLORS.tether;
    ctx.fillRect(this.px - 6, this.py - 6, 12, 8);
    ctx.beginPath();
    ctx.arc(this.endX, this.endY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { rectsOverlap };
