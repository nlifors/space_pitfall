// Thin keyboard layer. The game reads `keys` for held state and consumes
// edge-triggered presses via wasPressed() so a single tap == a single action.

const held = new Set();
const pressedThisFrame = new Set();

const KEY_ALIASES = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  Space: "jump",
  KeyW: "jump",
  ArrowDown: "down",
  KeyS: "down",
  KeyZ: "grab",
  KeyP: "pause",
  KeyM: "mute",
  Enter: "start",
};

function resolve(code) {
  return KEY_ALIASES[code] || null;
}

window.addEventListener("keydown", (e) => {
  const action = resolve(e.code);
  if (!action) return;
  if (action === "jump" || action === "pause" || action === "down") e.preventDefault();
  if (!held.has(action)) pressedThisFrame.add(action);
  held.add(action);
});

window.addEventListener("keyup", (e) => {
  const action = resolve(e.code);
  if (action) held.delete(action);
});

// Lose held keys when the tab loses focus so the player doesn't "stick".
window.addEventListener("blur", () => held.clear());

export const input = {
  isDown: (action) => held.has(action),
  wasPressed: (action) => pressedThisFrame.has(action),
  // Called once at the end of every frame by the game loop.
  endFrame: () => pressedThisFrame.clear(),
};
