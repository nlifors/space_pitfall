// Game orchestrator: owns the loop, the state machine, screen transitions,
// the collision pass, scoring, lives and the HUD. Rendering of individual
// things lives on the entities/player; the Game only composites them and the
// chrome (starfield + HUD + overlay text).

import { VIEW, WORLD, PLAYER, GAME, SCORE, COLORS } from "./constants.js";
import { input } from "./input.js";
import { Player } from "./player.js";
import { buildLevel } from "./level.js";
import { Particles } from "./particles.js";

// The simulation runs at a fixed 60 ticks/second. Rendering happens once per
// animation frame; the accumulator below runs as many fixed ticks as real time
// demands, so the game plays at the same speed on 60/120/144Hz displays.
const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250; // clamp huge gaps (tab-out) to avoid a tick spiral

const STATE = {
  TITLE: "title",
  PLAYING: "playing",
  PAUSED: "paused",
  RESPAWN: "respawn",
  GAMEOVER: "gameover",
  WIN: "win",
};

export class Game {
  constructor(canvas, overlay, audio) {
    this.ctx = canvas.getContext("2d");
    this.overlay = overlay; // { root, msg, button, title }
    this.audio = audio;
    this.state = STATE.TITLE;
    this.stars = this.makeStars(90);
    this.lastTime = 0;
    this.acc = 0; // accumulated real time owed to the fixed-step simulation
    this.respawnTimer = 0;
    this.fx = new Particles();
    this.shake = 0; // screen-shake intensity in logical px, decays each frame

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  makeStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * VIEW.WIDTH,
        y: Math.random() * WORLD.FLOOR_Y,
        r: Math.random() * 1.6 + 0.4,
        tw: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }

  // ---- session lifecycle ----------------------------------------------------
  start() {
    this.screens = buildLevel(GAME.SCREEN_COUNT);
    this.screenIndex = 0;
    this.player = new Player();
    this.player.reset(60, WORLD.FLOOR_Y - PLAYER.H);
    this.lives = PLAYER.START_LIVES;
    this.score = 0;
    this.crystals = 0;
    this.timeLeft = GAME.TIME_LIMIT;
    this.frameAcc = 0;
    this.invuln = 0;
    this.fx = new Particles();
    this.shake = 0;
    this.state = STATE.PLAYING;
    this.hideOverlay();
    this.audio.unlock();
    this.audio.startMusic();
  }

  get screen() { return this.screens[this.screenIndex]; }

  loseLife() {
    // Death juice: a bright suit-colored burst plus a sharp screen shake.
    this.fx.emit(this.player.centerX, this.player.centerY, {
      count: 26, color: COLORS.player, speed: 4.5, gravity: 0.12, life: 38, size: 3, drag: 0.93,
    });
    this.fx.emit(this.player.centerX, this.player.centerY, {
      count: 14, color: COLORS.visor, speed: 3, gravity: 0.08, life: 30, size: 2, drag: 0.93,
    });
    this.shake = 14;
    this.audio.death();
    this.lives--;
    if (this.lives <= 0) {
      this.endGame(false);
    } else {
      this.state = STATE.RESPAWN;
      this.respawnTimer = 45; // frames of pause before respawning
    }
  }

  respawn() {
    this.player.reset(60, WORLD.FLOOR_Y - PLAYER.H);
    this.invuln = GAME.RESPAWN_INVULN;
    this.state = STATE.PLAYING;
  }

  advanceScreen(dir) {
    const next = this.screenIndex + dir;
    if (next >= this.screens.length) {
      this.endGame(true);
      return;
    }
    if (next < 0) {
      this.player.x = 0;
      return;
    }
    this.screenIndex = next;
    if (dir > 0) this.audio.sector(); // a little chime on clearing a sector
    // Enter from the opposite edge we exited.
    this.player.x = dir > 0 ? 2 : VIEW.WIDTH - this.player.w - 2;
  }

  endGame(won) {
    if (won) {
      this.score += SCORE.LEVEL_CLEAR + Math.floor(this.timeLeft) * SCORE.TIME_BONUS_PER_SEC;
    }
    this.audio.stopMusic();
    if (won) this.audio.win();
    this.state = won ? STATE.WIN : STATE.GAMEOVER;
    this.showOverlay(
      won ? "MISSION COMPLETE" : "LOST TO THE VOID",
      won
        ? `You crossed all sectors. Score ${this.score}.`
        : `You collected ${this.crystals} crystals. Score ${this.score}.`,
      "PLAY AGAIN"
    );
  }

  // ---- per-frame update -----------------------------------------------------
  step() {
    // countdown timer at ~60fps
    this.frameAcc++;
    if (this.frameAcc >= 60) {
      this.frameAcc = 0;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame(false);
        return;
      }
    }

    this.screen.update();
    this.player.update((wx) => this.screen.isSolidAt(wx), this.screen.tethers);

    // Translate the player's one-frame event flags into sound effects.
    if (this.player.justJumped) { this.audio.jump(); this.player.justJumped = false; }
    if (this.player.justGrabbed) { this.audio.grab(); this.player.justGrabbed = false; }
    if (this.player.justReleased) { this.audio.release(); this.player.justReleased = false; }

    // Jet exhaust: a warm downward plume from the jetpack nozzle while flying.
    if (this.player.state !== "ground") {
      const noz = this.player.jetNozzle;
      this.fx.emit(noz.x, noz.y, {
        count: 2, color: COLORS.flameCore, dir: Math.PI / 2, spread: 0.5,
        speed: 2.4, gravity: 0.05, life: 18, size: 3, drag: 0.9,
      });
      this.fx.emit(noz.x, noz.y, {
        count: 1, color: COLORS.flame, dir: Math.PI / 2, spread: 0.9,
        speed: 1.7, gravity: 0.04, life: 24, size: 4, drag: 0.9,
      });
    }
    this.fx.update();

    if (this.invuln > 0) this.invuln--;

    // Fell into a chasm? (the void is fatal even during invulnerability)
    if (this.player.fellIntoChasm) { this.loseLife(); return; }

    // Hazard + pickup collisions.
    const box = this.player.box;
    for (const e of this.screen.entities) {
      if (this.invuln <= 0 && e.kind === "hazard" && e.hits && e.hits(box)) { this.loseLife(); return; }
      if (e.kind === "pickup" && e.hits && e.hits(box)) {
        e.collected = true;
        this.crystals++;
        this.score += SCORE.CRYSTAL;
        this.fx.emit(e.x + e.w / 2, e.y + e.h / 2, {
          count: 18, color: COLORS.crystal, speed: 3.2, gravity: 0.05, life: 34, size: 3, drag: 0.92,
        });
        this.audio.collect();
      }
    }
    // Drop collected pickups.
    this.screen.entities = this.screen.entities.filter((e) => !e.collected);

    // Screen edge transitions (only when on solid footing, not mid-swing).
    if (this.player.x + this.player.w > VIEW.WIDTH) this.advanceScreen(1);
    else if (this.player.x < -2) this.advanceScreen(-1);
  }

  // ---- main loop ------------------------------------------------------------
  // Fixed-timestep: accumulate elapsed wall-clock time and run whole 1/60s ticks
  // until it's spent, then render once. Decouples game speed from refresh rate.
  loop(ts) {
    requestAnimationFrame(this.loop);

    if (!this.lastTime) this.lastTime = ts;
    let frame = ts - this.lastTime;
    this.lastTime = ts;
    if (frame > MAX_FRAME_MS) frame = MAX_FRAME_MS;

    this.acc += frame;
    while (this.acc >= STEP_MS) {
      this.tick();
      this.acc -= STEP_MS;
      // Consume edge-triggered presses with the tick that saw them so a single
      // tap can't be processed by two ticks in one render frame.
      input.endFrame();
    }

    this.render();
  }

  // One fixed simulation tick. All time-based game state advances here.
  tick() {
    if (input.wasPressed("mute")) this.audio.toggleMute();

    if (this.state === STATE.PLAYING) {
      if (input.wasPressed("pause")) { this.state = STATE.PAUSED; }
      else this.step();
    } else if (this.state === STATE.PAUSED) {
      if (input.wasPressed("pause")) this.state = STATE.PLAYING;
    } else if (this.state === STATE.RESPAWN) {
      this.fx.update(); // let the death burst finish during the pause
      if (--this.respawnTimer <= 0) this.respawn();
    }
  }

  // ---- rendering ------------------------------------------------------------
  render() {
    const ctx = this.ctx;
    // Map the fixed 800x450 logical space onto the (resizable) backing store.
    // The CSS keeps the canvas at 16:9, so this scale is uniform — no distortion.
    ctx.setTransform(
      ctx.canvas.width / VIEW.WIDTH,
      0,
      0,
      ctx.canvas.height / VIEW.HEIGHT,
      0,
      0
    );
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
    this.drawStars(ctx);

    if (this.state === STATE.TITLE || this.state === STATE.GAMEOVER || this.state === STATE.WIN) {
      // overlay DOM handles text; just show a calm backdrop
      return;
    }

    // World layer — offset by the screen shake so the HUD (drawn after) stays
    // rock steady. Stars/background above are not shaken either.
    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.86;
    } else {
      this.shake = 0;
    }
    this.screen.draw(ctx);
    // Defensive: never let an entity's glow (shadow) state bleed onto the player.
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    // Blink the astronaut while invulnerable so the grace period is legible.
    if (this.invuln <= 0 || Math.floor(this.invuln / 6) % 2 === 0) {
      this.player.draw(ctx);
    }
    this.fx.draw(ctx);
    ctx.restore();

    this.drawHUD(ctx);

    if (this.state === STATE.PAUSED) this.drawCenter(ctx, "PAUSED", "press P to resume");
    if (this.state === STATE.RESPAWN) this.drawCenter(ctx, "", `${this.lives} lives left`);
  }

  drawStars(ctx) {
    for (const s of this.stars) {
      s.tw += 0.02;
      const a = 0.4 + Math.sin(s.tw) * 0.3;
      ctx.fillStyle = `rgba(200,220,255,${a})`;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  drawHUD(ctx) {
    ctx.fillStyle = "rgba(5,8,20,0.6)";
    ctx.fillRect(0, 0, VIEW.WIDTH, 30);
    ctx.fillStyle = COLORS.hud;
    ctx.font = "16px 'Courier New', monospace";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${this.score}`, 12, 15);
    ctx.fillText(`◆ ${this.crystals}`, 170, 15);

    // sound state (toggle with M)
    ctx.fillStyle = this.audio.muted ? "#5b6b8c" : COLORS.hud;
    ctx.fillText(this.audio.muted ? "♪ off" : "♪ on", 250, 15);

    ctx.fillStyle = COLORS.hud;
    ctx.textAlign = "center";
    ctx.fillText(`SECTOR ${this.screenIndex + 1}/${this.screens.length}`, VIEW.WIDTH / 2, 15);

    ctx.textAlign = "right";
    const t = String(this.timeLeft).padStart(3, "0");
    ctx.fillStyle = this.timeLeft <= 15 ? "#ff6b6b" : COLORS.hud;
    ctx.fillText(`⏱ ${t}`, VIEW.WIDTH - 90, 15);

    // life pips
    ctx.fillStyle = COLORS.player;
    for (let i = 0; i < this.lives; i++) {
      ctx.beginPath();
      ctx.arc(VIEW.WIDTH - 70 + i * 18, 15, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCenter(ctx, big, small) {
    ctx.textAlign = "center";
    if (big) {
      ctx.fillStyle = COLORS.visor;
      ctx.font = "bold 40px 'Courier New', monospace";
      ctx.fillText(big, VIEW.WIDTH / 2, VIEW.HEIGHT / 2 - 10);
    }
    if (small) {
      ctx.fillStyle = COLORS.hud;
      ctx.font = "16px 'Courier New', monospace";
      ctx.fillText(small, VIEW.WIDTH / 2, VIEW.HEIGHT / 2 + 24);
    }
  }

  // ---- overlay helpers ------------------------------------------------------
  showOverlay(title, msg, btn) {
    this.overlay.title.textContent = title;
    this.overlay.msg.textContent = msg;
    this.overlay.button.textContent = btn;
    this.overlay.root.classList.remove("hidden");
  }
  hideOverlay() {
    this.overlay.root.classList.add("hidden");
  }
}
