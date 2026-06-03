// Bootstrap: wire the DOM overlay to the Game and kick it off.

import { Game } from "./game.js";

const canvas = document.getElementById("game");
const overlay = {
  root: document.getElementById("overlay"),
  title: document.querySelector("#overlay .logo"),
  msg: document.getElementById("overlay-msg"),
  button: document.getElementById("start-btn"),
};

// Match the canvas backing store to its on-screen size at native pixel density
// so the game renders crisply at any window size. The Game keeps drawing in its
// fixed 800x450 logical space and scales the context to fit (see Game.render).
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const game = new Game(canvas, overlay);

overlay.button.addEventListener("click", () => game.start());

// Allow Enter to start/restart from the keyboard too.
window.addEventListener("keydown", (e) => {
  if (e.code === "Enter" && overlay.root.classList.contains("hidden") === false) {
    game.start();
  }
});
