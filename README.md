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
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Key            | Action           |
| -------------- | ---------------- |
| `←` / `→`      | Move             |
| `Space` / `↑`  | Jump             |
| `Z`            | Grab / release tether |
| `P`            | Pause            |
| `Enter`        | Start / restart  |

## Goal

Clear all sectors before the timer expires. Falling into a chasm or touching a
hazard costs a life; you start with three. Crystals and remaining time award
bonus score.
