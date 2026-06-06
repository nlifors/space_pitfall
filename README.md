```
███████╗██████╗  █████╗  ██████╗███████╗    ██████╗ ██╗████████╗███████╗ █████╗ ██╗     ██╗
██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝    ██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║     ██║
███████╗██████╔╝███████║██║     █████╗      ██████╔╝██║   ██║   █████╗  ███████║██║     ██║
╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝      ██╔═══╝ ██║   ██║   ██╔══╝  ██╔══██║██║     ██║
███████║██║     ██║  ██║╚██████╗███████╗    ██║     ██║   ██║   ██║     ██║  ██║███████╗███████╗
╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝    ╚═╝     ╚═╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝
```

<div align="center">

`✨ · 🌠 ⭐ · ✨ · 🌌 · ⭐ 🌠 · ✨ · ⭐ · 🌠 ✨`

```
⬛⬛⬜⬜⬜⬜⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
⬛⬜🟦🟦🟦⬜⬜⬛⬛⬛⬛🟥⬛⬛⬛⬛
⬛⬜🟦🟦🟦⬜⬜⬛⬛⬛🟥🟥🟥⬛⬛⬛
🟪⬜⬜⬜⬜⬜⬜⬛⬛⬛🟥🟥🟥⬛⬛⬛
🟪⬜⬜🟨🟨⬜⬜⬛⬛⬛⬛🟥⬛⬛⬛⬛
🟪⬜⬜⬜⬜⬜⬜⬛⬛⬛⬛⬛⬛⬛⬛⬛
🟧⬜🟨⬛🟨⬜⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
🟧⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛
🟫🟫🟫🟫🟫⬛⬛⬛⬛🟫🟫🟫🟫🟫🟫🟫
⬛⬛⬛⬛⬛⬛🕳️⬛⬛⬛⬛⬛⬛⬛⬛⬛
```

**Cross the chasms · Grab the 💎 crystals · Beware the 🕳️ void**

🧑‍🚀 jetpack spaceman&nbsp;&nbsp;·&nbsp;&nbsp;🟥 crystal&nbsp;&nbsp;·&nbsp;&nbsp;🟫 surface&nbsp;&nbsp;·&nbsp;&nbsp;🟧 jet thrust

</div>

# Space Pitfall

A space-themed **Pitfall!**-style platformer built with vanilla JavaScript and
the HTML5 Canvas — no build step, no dependencies. Pilot an astronaut across a
series of hostile sectors: jump chasms, swing across the void on an energy
tether, dodge crawling aliens, rolling asteroids and timed laser gates, and
grab every crystal before the clock runs out.

## Play

ES modules must be served over HTTP (opening `index.html` via `file://` is
blocked by browser CORS rules). From the project root:

```bash
python3 serve.py            # no-cache dev server -> http://localhost:8000
# or: python3 -m http.server 8000   (caches modules; hard-reload after edits)
```

`serve.py` disables HTTP caching so code edits show up on a normal refresh. With
plain `http.server` you must hard-reload (⌘+Shift+R) to drop cached JS modules.

## Controls

| Key            | Action           |
| -------------- | ---------------- |
| `←` / `→`      | Move             |
| `Space` / `↑`  | Jump             |
| `Z`            | Grab / release tether |
| `P`            | Pause            |
| `M`            | Mute / unmute    |
| `Enter`        | Start / restart  |

## Goal

Clear all sectors before the timer expires. Falling into a chasm or touching a
hazard costs a life; you start with three. Crystals and remaining time award
bonus score.
