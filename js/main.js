// Bootstrap: wire the DOM overlay to the Game and kick it off.

import { Game } from "./game.js";

const canvas = document.getElementById("game");
const overlay = {
  root: document.getElementById("overlay"),
  title: document.querySelector("#overlay .logo"),
  msg: document.getElementById("overlay-msg"),
  button: document.getElementById("start-btn"),
};

const game = new Game(canvas, overlay);

overlay.button.addEventListener("click", () => game.start());

// Allow Enter to start/restart from the keyboard too.
window.addEventListener("keydown", (e) => {
  if (e.code === "Enter" && overlay.root.classList.contains("hidden") === false) {
    game.start();
  }
});
