# lumen-drift

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/shanghai2204-art/lumen-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/shanghai2204-art/lumen-drift/reward.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Drift** is an original arena survival shooter in plain JavaScript and canvas — no engine, no assets, no network. You pilot the last light-craft in a drifting arena: hold off ten waves of the swarm to win, then keep drifting for score.

Four enemy kinds keep the loop changing: Drifters that hunt in packs, Darters that telegraph and lunge, Orbiters that strafe and shoot back, and Splitters that break into three. Kills drop lumen shards that feed a combo multiplier up to x8; a dash with brief immunity gets you out of corners. After every wave you pick one of three upgrades — damage, fire rate, split cannon, piercing rounds, shields that regrow, tractor field and more — so each run builds differently. All sound is synthesized live with WebAudio: shots, impacts, pickups, and a pulsing bass-and-arpeggio loop. The title screen runs an autopilot attract demo behind the panel.

Controls: WASD or arrows to move, mouse to aim, hold click or Space to fire, Shift to dash, P to pause, M to mute. Clear wave 10 for victory; your hull pips, shield, dash meter, score and combo are always on the HUD.

The source is split by job under `game/src/`: `world.js` is the whole simulation (it never touches the canvas), `render.js` draws everything, `bot.js` is the autopilot, `audio.js` synthesizes the sound, `input.js` and `config.js` and `random.js` support them, and `main.js` wires it together and runs the title/playing/upgrade/game-over states. The screenshots in `screenshots/` are real moments from the game's own demo scenes (`?shot=start|play|upgrade|end&seed=1`).

## Run it

```sh
cd game && python3 -m http.server 8901   # any static server works; then open http://localhost:8901/
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # hand-in: copies game/ + screenshots/, writes dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=a2pa2qga&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
