// Game orchestrator: owns the loop, the state machine, screen transitions,
// the collision pass, scoring, lives and the HUD. Rendering of individual
// things lives on the entities/player; the Game only composites them and the
// chrome (starfield + HUD + overlay text).

import { VIEW, WORLD, PLAYER, GAME, SCORE, COLORS } from "./constants.js";
import { input } from "./input.js";
import { Player } from "./player.js";
import { buildLevel } from "./level.js";

const STATE = {
  TITLE: "title",
  PLAYING: "playing",
  PAUSED: "paused",
  RESPAWN: "respawn",
  GAMEOVER: "gameover",
  WIN: "win",
};

export class Game {
  constructor(canvas, overlay) {
    this.ctx = canvas.getContext("2d");
    this.overlay = overlay; // { root, msg, button, title }
    this.state = STATE.TITLE;
    this.stars = this.makeStars(90);
    this.lastTime = 0;
    this.respawnTimer = 0;

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
    this.state = STATE.PLAYING;
    this.hideOverlay();
  }

  get screen() { return this.screens[this.screenIndex]; }

  loseLife() {
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
    // Enter from the opposite edge we exited.
    this.player.x = dir > 0 ? 2 : VIEW.WIDTH - this.player.w - 2;
  }

  endGame(won) {
    if (won) {
      this.score += SCORE.LEVEL_CLEAR + Math.floor(this.timeLeft) * SCORE.TIME_BONUS_PER_SEC;
    }
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
      }
    }
    // Drop collected pickups.
    this.screen.entities = this.screen.entities.filter((e) => !e.collected);

    // Screen edge transitions (only when on solid footing, not mid-swing).
    if (this.player.x + this.player.w > VIEW.WIDTH) this.advanceScreen(1);
    else if (this.player.x < -2) this.advanceScreen(-1);
  }

  // ---- main loop ------------------------------------------------------------
  loop(ts) {
    requestAnimationFrame(this.loop);

    if (this.state === STATE.PLAYING) {
      if (input.wasPressed("pause")) { this.state = STATE.PAUSED; }
      else this.step();
    } else if (this.state === STATE.PAUSED) {
      if (input.wasPressed("pause")) this.state = STATE.PLAYING;
    } else if (this.state === STATE.RESPAWN) {
      if (--this.respawnTimer <= 0) this.respawn();
    }

    this.render();
    input.endFrame();
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

    this.screen.draw(ctx);
    // Blink the astronaut while invulnerable so the grace period is legible.
    if (this.invuln <= 0 || Math.floor(this.invuln / 6) % 2 === 0) {
      this.player.draw(ctx);
    }
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
