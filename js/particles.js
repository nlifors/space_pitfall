// Tiny, allocation-light particle system shared by the whole game. One pool of
// short-lived sparks; entities/Game call emit() to spawn bursts and the Game
// drives update()/draw() once per frame. Particles are pure visual juice — they
// never affect collisions or scoring.

export class Particles {
  constructor() {
    this.list = [];
  }

  // Spawn `count` sparks from (x, y). Defaults make a soft omni-directional puff;
  // pass `dir`/`spread` for a cone (e.g. downward jet exhaust).
  emit(x, y, opts = {}) {
    const {
      count = 8,
      color = "#ffffff",
      speed = 2,
      spread = Math.PI * 2, // cone width in radians
      dir = 0,              // cone center angle (0 = right, PI/2 = down)
      gravity = 0.1,
      life = 30,
      size = 2,
      drag = 0.96,
    } = opts;

    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.6);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        gravity,
        drag,
        life,
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.7),
        color,
      });
    }
  }

  update() {
    for (const p of this.list) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    }
    // Reap dead sparks. Filter is fine for the small counts we deal with.
    if (this.list.length) this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
