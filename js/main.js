// Bootstrap: wire the DOM overlay to the Game and kick it off.

import { Game } from "./game.js";
import { Audio } from "./audio.js";
import { VIEW } from "./constants.js";

// Cap the canvas backing-store width. The art is simple vector/pixel work, so
// rendering above this and letting CSS upscale to fill the window looks fine and
// is far cheaper. Without a cap, a fullscreen Retina window (window x dpr) makes
// a ~5-15M-pixel buffer that drops the game to single-digit fps — a "freeze".
const MAX_BACKING_W = 1600; // 2x the 800-wide logical space

const canvas = document.getElementById("game");
const overlay = {
  root: document.getElementById("overlay"),
  title: document.querySelector("#overlay .logo"),
  msg: document.getElementById("overlay-msg"),
  button: document.getElementById("start-btn"),
};

// Size the canvas backing store to its on-screen size at native pixel density,
// but capped (see MAX_BACKING_W). Height is derived from the logical aspect so
// the buffer stays exactly 16:9 — that keeps Game.render's x/y scale uniform.
// The Game always draws in its fixed 800x450 logical space.
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.min(Math.round(rect.width * dpr), MAX_BACKING_W);
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, Math.round(w * (VIEW.HEIGHT / VIEW.WIDTH)));
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const audio = new Audio();
const game = new Game(canvas, overlay, audio);

// The click is a user gesture, so it's a valid moment to unlock Web Audio.
overlay.button.addEventListener("click", () => {
  audio.unlock();
  game.start();
});

// Allow Enter to start/restart from the keyboard too.
window.addEventListener("keydown", (e) => {
  if (e.code === "Enter" && overlay.root.classList.contains("hidden") === false) {
    game.start();
  }
});
