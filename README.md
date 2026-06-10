```
                         :-==++=-:.
                     .=#@@@@@@@@@@@%*-
                   .*@@@@@@@@@@@@@@@@@%=
                  =@@@@@@@@%%%#####%%%@@#.
                 +@@@@@@@%######%%@%###%@@:
                :@@@@@@@########@@@@%####@#
                *@@@@@@%#########%%######%@.
 ###############@@@@@@@%#################%@.
 %%%%%%%%%%%%%%%@@@@@@@@#################@%
 %%%%%%%%%%%%%%%%@@@@@@@@###############@@=
 %#--------------#@@@@@@@@@%#########%@@@=
 %#--------------%@@@@@@@@@@@@@@@@@@@@@#.       ███████╗██████╗  █████╗  ██████╗███████╗
 %#-------------#@@@@@@@@@@@@@@@@@@@@@:         ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝
 %%#############@@@@@@@@@@@@@@@@@@@@@@+         ███████╗██████╔╝███████║██║     █████╗
 %%%%%%%%%%%%%%@@@@@@@######@@@@@@@@@@#         ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝
 %#============#@@@@@%#####%@@@@@@@@@@#         ███████║██║     ██║  ██║╚██████╗███████╗
 %#------------#@@@@@%#####@@@@@@@@@@@#         ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝
 %#------------#@@@@@%####%@@@@@@@@@@@#
 %#------------#@@@@@@####%%##%%@@@@@@#         ██████╗ ██╗████████╗███████╗ █████╗ ██╗     ██╗
 %%++++++++++++#@@@@@@@@@########@@@@@+         ██╔══██╗██║╚══██╔══╝██╔════╝██╔══██╗██║     ██║
 %%%%%%%%%%%%%%%@@@@@@@@%########%@@@*          ██████╔╝██║   ██║   █████╗  ███████║██║     ██║
 %%++++++++++++++%@%@@@@@########@%+:           ██╔═══╝ ██║   ██║   ██╔══╝  ██╔══██║██║     ██║
 %#--------------#% *%%%%%####%%@%:             ██║     ██║   ██║   ██║     ██║  ██║███████╗███████╗
 %%%%%%%%%%%%%%%%%%*#########%%####:            ╚═╝     ╚═╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝
 #%%%%%%%%%%%###%###################*.
  :+#%%%%%++    +####################*
   +*#%%%#+-    -#########++#########+
   -+*##*++.     -*######=  -*#####*-
    ++##*++        .:--:      .:-:.
    =+*#++:
    :++*++
     ++++:
     -+++
      ++-
      =+.
      .+
```

<div align="center">

**Cross the chasms · Grab the 💎 crystals · Dodge the 🟥 lasers · Beware the 🕳️ void**

### ▶ [**Play in your browser**](https://nlifors.github.io/space_pitfall/)

</div>

# Space Pitfall

A space-themed **Pitfall!**-style platformer built with vanilla JavaScript and
the HTML5 Canvas — no build step, no dependencies. Pilot a jetpack astronaut
across a series of hostile sectors: jump chasms, swing across the void on an
energy tether, dodge crawling aliens, rolling asteroids and timed laser gates,
and grab every crystal before the clock runs out. Climb down a ladder into the
**underground tunnel** to bypass surface hazards — but watch for spikes below.

## Play

Play the live build at **<https://nlifors.github.io/space_pitfall/>**.

To run it locally, note that ES modules must be served over HTTP (opening
`index.html` via `file://` is blocked by browser CORS rules). From the project
root:

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
| `↓` / `S`      | Climb **down** a ladder (into the tunnel) |
| `Space` / `↑`  | Climb **up** a ladder (back to the surface) |
| `Z`            | Grab / release tether |
| `P`            | Pause            |
| `M`            | Mute / unmute    |
| `Enter`        | Start / restart  |

## Goal

Clear all sectors before the timer expires. Touching a hazard costs a life; you
start with five. Falling into a surface chasm drops you into the underground
tunnel (no damage) — climb a ladder to get back up, but avoid the spikes down
there. Crystals and remaining time award bonus score.

## The map

Five hand-authored sectors of rising difficulty. Each is a single screen with a
surface (top) and an underground tunnel (bottom). Crystals (◆) are the
treasures — **18 in all** — and some hide in the tunnel as a risk/reward for
braving the spikes.

| # | Sector | Surface | Tunnel | ◆ |
| - | ------ | ------- | ------ | - |
| 1 | **Landing Zone** | One slow crawler — a gentle intro. | Ladder down to a near-free crystal. | 3 |
| 2 | **The Rift** | A wide chasm with a **tether** to swing across; a crystal floats over the gap. | Fall in or take a ladder; spikes under the gap, a crystal beyond. | 3 |
| 3 | **Asteroid Run** | Two rolling asteroids barreling in. | A spiky but treasure-rich **bypass** under the carnage. | 3 |
| 4 | **Laser Gauntlet** | Three timed laser gates to thread; a chasm at the exit. | A detour that skips the worst beams; two hidden crystals. | 4 |
| 5 | **The Gauntlet** | Everything at once — crawler, tether chasm, laser, asteroid. | A three-spike run guarding two crystals. | 5 |

Levels are plain data in [`js/level.js`](js/level.js) (a `LEVELS` array of
`Screen` builders), so they're easy to tweak or extend.
