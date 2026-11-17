// Lumen Drift — the shell: boot, the state machine (title, playing,
// upgrade, game over), the frame loop, and the screenshot scenes the
// maker captures with ?shot=start|play|upgrade|end&seed=N. The scenes run
// the real simulation with the autopilot, so a screenshot is a moment the
// game itself produced.

import { WIDTH, HEIGHT } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, startWave, stepWorld, rollUpgrades } from './world.js';
import { botControls } from './bot.js';
import { drawScene, drawHUD, drawTitle, drawUpgrade, drawGameOver, drawBanner, drawPaused } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

let best = 0;
try {
  best = Number(localStorage.getItem('lumen-drift-best') ?? 0) || 0;
} catch {
  best = 0;
}

let mode = 'title'; // title | playing | upgrade | over
let paused = false;
let world = createWorld(seed * 7919 + 13);
let demo = true;
let demoAge = 0;
let choices = [];
let hoverCard = -1;
let cardLayout = null;
let bannerText = '';
let bannerUntil = 0;

startWave(world, 2); // the attract demo opens mid-action

function humanControls() {
  return {
    move: input.moveAxis(),
    aim: { x: input.mouse.x, y: input.mouse.y },
    firing: input.mouse.down || input.keys.has('Space'),
    dash: input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'),
  };
}

function beginRun() {
  world = createWorld((Date.now() % 2147483647) | 1);
  demo = false;
  demoAge = 0;
  paused = false;
  startWave(world, 1);
  mode = 'playing';
}

function toTitle() {
  world = createWorld(seed * 7919 + 13);
  demo = true;
  demoAge = 0;
  startWave(world, 2);
  mode = 'title';
}

function applyUpgrade(u) {
  u.apply(world);
  audio.upgrade();
  startWave(world, world.wave + 1);
  mode = 'playing';
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev === 'victory') {
      bannerText = 'VICTORY — THE SWARM BREAKS';
      bannerUntil = world.time + 2.6;
    }
    if (ev === 'waveclear') {
      if (demo) {
        const rolled = rollUpgrades(world);
        rolled[0].apply(world);
        startWave(world, world.wave + 1);
      } else if (mode === 'playing') {
        choices = rollUpgrades(world);
        mode = 'upgrade';
      }
    }
    if (ev === 'gameover') {
      if (demo) {
        toTitle();
      } else {
        mode = 'over';
        if (world.score > best) {
          best = world.score;
          try {
            localStorage.setItem('lumen-drift-best', String(best));
          } catch {
            /* storage unavailable: the page still shows the best this run */
          }
        }
      }
    }
  }
}

function step(dt) {
  if (mode === 'upgrade' || paused) return;
  const controls = demo ? botControls(world) : humanControls();
  const events = stepWorld(world, controls, dt, audio);
  handleEvents(events);
  if (demo) {
    demoAge += dt;
    if (demoAge > 90) toTitle();
  }
}

function upgradeHover() {
  if (!cardLayout) return -1;
  const { x0, y0, w, h, gap } = cardLayout;
  const mx = input.mouse.x;
  const my = input.mouse.y;
  for (let i = 0; i < 3; i++) {
    const x = x0 + i * (w + gap);
    if (mx >= x && mx <= x + w && my >= y0 && my <= y0 + h) return i;
  }
  return -1;
}

function draw() {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawScene(ctx, world);
  ctx.restore();
  if (mode !== 'title') drawHUD(ctx, world, { muted: audio.muted });
  if (bannerText && world.time < bannerUntil && mode === 'playing') drawBanner(ctx, world, bannerText);
  if (mode === 'title') drawTitle(ctx, world);
  if (mode === 'upgrade') {
    hoverCard = upgradeHover();
    cardLayout = drawUpgrade(ctx, world, choices, hoverCard);
  }
  if (mode === 'over') drawGameOver(ctx, world, best);
  if (paused && mode === 'playing') drawPaused(ctx);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;

  if (input.takePressed('KeyM')) audio.toggleMute();
  if (mode === 'playing' && input.takePressed('KeyP')) paused = !paused;

  if (mode === 'title' && (input.takePressed('Enter') || input.takePressed('PointerDown'))) {
    audio.unlock();
    beginRun();
  } else if (mode === 'over' && (input.takePressed('Enter') || input.takePressed('PointerDown'))) {
    audio.unlock();
    beginRun();
  } else if (mode === 'upgrade') {
    const n = ['Digit1', 'Digit2', 'Digit3'].findIndex((c) => input.takePressed(c));
    if (n >= 0 && choices[n]) applyUpgrade(choices[n]);
    else if (input.takePressed('PointerDown') && hoverCard >= 0 && choices[hoverCard]) applyUpgrade(choices[hoverCard]);
  }
  if (input.takePressed('PointerDown')) audio.unlock();

  step(dt);
  draw();
  input.clearPressed();
  requestAnimationFrame(frame);
}

// --- screenshot scenes: pre-simulated real moments -----------------------
function presim(steps, atWave) {
  world = createWorld(seed * 104729 + 7);
  demo = true;
  startWave(world, atWave);
  for (let i = 0; i < steps; i++) {
    const events = stepWorld(world, botControls(world), 1 / 60, audio);
    for (const ev of events) {
      if (ev === 'waveclear') {
        rollUpgrades(world)[0].apply(world);
        startWave(world, world.wave + 1);
      }
      if (ev === 'gameover') return;
    }
  }
}

if (shot === 'start') {
  presim(60 * 7, 2);
  mode = 'title';
  demo = true;
} else if (shot === 'play') {
  presim(60 * 8, 4);
  mode = 'playing';
  demo = true;
} else if (shot === 'upgrade') {
  presim(60 * 5, 2);
  world.enemies = [];
  world.spawnQueue = [];
  world.phase = 'cleared';
  choices = rollUpgrades(world);
  mode = 'upgrade';
  demo = false;
} else if (shot === 'end') {
  presim(60 * 50, 7);
  if (world.player.hp > 0) world.player.hp = 0;
  mode = 'over';
  demo = false;
}

requestAnimationFrame(frame);
