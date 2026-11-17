// The simulation: player, four enemy kinds, bullets, shards, particles and
// waves. Pure state and stepping — nothing here touches the canvas or the
// DOM, so the same step function drives live play, the attract demo and
// the screenshot scenes.

import { WIDTH, HEIGHT, PLAYER, ENEMY_STYLE, VICTORY_WAVE } from './config.js';
import { mulberry32, range } from './random.js';

export const UPGRADES = [
  { id: 'dmg', name: 'Heavy Rounds', desc: '+1 damage per shot', apply: (w) => { w.player.damage += 1; } },
  { id: 'rate', name: 'Rapid Cycler', desc: 'Fire 20% faster', apply: (w) => { w.player.fireInterval *= 0.8; } },
  { id: 'speed', name: 'Ion Thrusters', desc: '+12% move speed', apply: (w) => { w.player.speed *= 1.12; } },
  { id: 'hull', name: 'Reinforced Hull', desc: '+1 max hull, repair 2', apply: (w) => { w.player.maxHp += 1; w.player.hp = Math.min(w.player.maxHp, w.player.hp + 2); } },
  { id: 'shield', name: 'Aegis Cell', desc: '+1 shield (blocks a hit, regrows)', apply: (w) => { w.player.maxShield += 1; w.player.shield = w.player.maxShield; } },
  { id: 'multi', name: 'Split Cannon', desc: '+1 projectile per volley', apply: (w) => { w.player.multishot = Math.min(4, w.player.multishot + 1); } },
  { id: 'magnet', name: 'Tractor Field', desc: '+70% shard pickup radius', apply: (w) => { w.player.magnet *= 1.7; } },
  { id: 'pierce', name: 'Lance Rounds', desc: 'Shots pierce +1 enemy', apply: (w) => { w.player.pierce += 1; } },
  { id: 'dash', name: 'Phase Coils', desc: 'Dash recharges 30% faster', apply: (w) => { w.player.dashCooldown *= 0.7; } },
];

function makePlayer() {
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    shield: 0,
    maxShield: 0,
    shieldTimer: 0,
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    fireCd: 0,
    multishot: 1,
    pierce: 0,
    magnet: 60,
    dashCd: 0,
    dashCooldown: PLAYER.dashCooldown,
    dashTime: 0,
    dashDx: 0,
    dashDy: 0,
    invuln: 0,
  };
}

export function createWorld(seed) {
  return {
    rng: mulberry32(seed),
    time: 0,
    wave: 0,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    player: makePlayer(),
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    pickups: [],
    texts: [],
    spawnQueue: [],
    spawnTimer: 0,
    shake: 0,
    victoryShown: false,
    phase: 'fighting',
  };
}

export function comboMultiplier(world) {
  return Math.min(8, 1 + Math.floor(world.combo / 4));
}

function enemyHp(kind, wave) {
  const bonus = Math.floor(wave / 5);
  if (kind === 'drifter') return 1 + bonus;
  if (kind === 'darter') return 1 + bonus;
  if (kind === 'orbiter') return 2 + bonus;
  return 6 + Math.floor(wave / 3); // splitter
}

export function startWave(world, wave) {
  world.wave = wave;
  world.phase = 'fighting';
  const queue = [];
  const drifters = 4 + wave * 2;
  const darters = wave >= 2 ? 1 + wave : 0;
  const orbiters = wave >= 3 ? Math.floor(wave / 2) : 0;
  const splitters = wave >= 4 ? Math.floor((wave - 2) / 2) : 0;
  for (let i = 0; i < drifters; i++) queue.push('drifter');
  for (let i = 0; i < darters; i++) queue.push('darter');
  for (let i = 0; i < orbiters; i++) queue.push('orbiter');
  for (let i = 0; i < splitters; i++) queue.push('splitter');
  // Shuffle so kinds arrive mixed, not in blocks.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  world.spawnQueue = queue;
  world.spawnTimer = 0.8;
}

function spawnPoint(world) {
  const p = world.player;
  for (let tries = 0; tries < 12; tries++) {
    const edge = Math.floor(world.rng() * 4);
    const x = edge === 0 ? 30 : edge === 1 ? WIDTH - 30 : range(world.rng, 40, WIDTH - 40);
    const y = edge === 2 ? 30 : edge === 3 ? HEIGHT - 30 : range(world.rng, 40, HEIGHT - 40);
    if (Math.hypot(x - p.x, y - p.y) > 280) return { x, y };
  }
  return { x: 40, y: 40 };
}

function spawnEnemy(world, kind, x, y) {
  const style = ENEMY_STYLE[kind];
  world.enemies.push({
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: style.radius,
    hp: enemyHp(kind, world.wave),
    maxHp: enemyHp(kind, world.wave),
    spawnIn: 0.5,
    t: range(world.rng, 0, 10),
    fireCd: range(world.rng, 1.6, 2.8),
    lungeCd: range(world.rng, 1.2, 2.4),
    lungeTime: 0,
    strafeDir: world.rng() < 0.5 ? -1 : 1,
    flash: 0,
  });
}

function burst(world, x, y, color, count, speed, size = 3) {
  for (let i = 0; i < count; i++) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.25, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0,
      maxLife: range(world.rng, 0.25, 0.6),
      size: range(world.rng, size * 0.5, size * 1.4),
      color,
    });
  }
}

function addText(world, x, y, str, color, size = 15) {
  world.texts.push({ x, y, str, color, size, life: 0, maxLife: 0.9 });
}

function hurtPlayer(world, audio) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTime > 0) return;
  if (p.shield > 0) {
    p.shield -= 1;
    p.shieldTimer = 0;
    p.invuln = PLAYER.invulnTime;
    burst(world, p.x, p.y, '#7db4ff', 14, 260);
    audio.hit();
    return;
  }
  p.hp -= 1;
  p.invuln = PLAYER.invulnTime;
  world.shake = Math.max(world.shake, 9);
  world.combo = 0;
  world.comboTimer = 0;
  burst(world, p.x, p.y, '#ff5d5d', 18, 300);
  audio.hurt();
}

function killEnemy(world, e, audio) {
  const style = ENEMY_STYLE[e.kind];
  const mult = comboMultiplier(world);
  const base = { drifter: 50, darter: 80, orbiter: 120, splitter: 200 }[e.kind];
  const gained = base * mult;
  world.score += gained;
  world.kills += 1;
  world.combo += 1;
  world.comboTimer = 2.5;
  addText(world, e.x, e.y - 10, `+${gained}`, '#ffe066', e.kind === 'splitter' ? 20 : 15);
  burst(world, e.x, e.y, style.color, e.kind === 'splitter' ? 30 : 14, e.kind === 'splitter' ? 340 : 260);
  world.shake = Math.max(world.shake, e.kind === 'splitter' ? 7 : 2.5);
  audio.boom(e.kind === 'splitter');
  const shards = e.kind === 'splitter' ? 4 : 1 + Math.floor(world.rng() * 2);
  for (let i = 0; i < shards; i++) {
    world.pickups.push({
      kind: 'shard',
      x: e.x + range(world.rng, -14, 14),
      y: e.y + range(world.rng, -14, 14),
      vx: range(world.rng, -40, 40),
      vy: range(world.rng, -40, 40),
      t: 0,
    });
  }
  if ((e.kind === 'splitter' || e.kind === 'orbiter') && world.player.hp < world.player.maxHp && world.rng() < 0.22) {
    world.pickups.push({ kind: 'heart', x: e.x, y: e.y, vx: 0, vy: 0, t: 0 });
  }
  if (e.kind === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + world.rng();
      spawnEnemy(world, 'drifter', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
      world.enemies[world.enemies.length - 1].spawnIn = 0.25;
    }
  }
}

/** Advance the world by dt seconds. Returns event names for the shell. */
export function stepWorld(world, controls, dt, audio) {
  const events = [];
  const p = world.player;
  world.time += dt;

  // --- spawning ---
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      const pt = spawnPoint(world);
      spawnEnemy(world, kind, pt.x, pt.y);
      world.spawnTimer = Math.max(0.16, 0.55 - world.wave * 0.02);
    }
  }

  // --- player ---
  const accel = p.dashTime > 0 ? 0 : 2400;
  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashDx * PLAYER.dashSpeed;
    p.vy = p.dashDy * PLAYER.dashSpeed;
  } else {
    p.vx += controls.move.x * accel * dt;
    p.vy += controls.move.y * accel * dt;
    const damp = Math.pow(0.0015, dt);
    if (controls.move.x === 0) p.vx *= damp;
    if (controls.move.y === 0) p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > p.speed) {
      p.vx = (p.vx / sp) * p.speed;
      p.vy = (p.vy / sp) * p.speed;
    }
  }
  if (controls.dash && p.dashCd <= 0 && p.dashTime <= 0) {
    const dx = controls.move.x || Math.cos(p.angle);
    const dy = controls.move.y || Math.sin(p.angle);
    const len = Math.hypot(dx, dy) || 1;
    p.dashDx = dx / len;
    p.dashDy = dy / len;
    p.dashTime = PLAYER.dashTime;
    p.dashCd = p.dashCooldown;
    burst(world, p.x, p.y, '#7df9ff', 8, 160, 2);
    audio.dash();
  }
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.x = Math.min(WIDTH - p.radius, Math.max(p.radius, p.x + p.vx * dt));
  p.y = Math.min(HEIGHT - p.radius, Math.max(p.radius, p.y + p.vy * dt));
  p.angle = Math.atan2(controls.aim.y - p.y, controls.aim.x - p.x);
  if (p.maxShield > 0 && p.shield < p.maxShield) {
    p.shieldTimer += dt;
    if (p.shieldTimer > 12) {
      p.shield += 1;
      p.shieldTimer = 0;
    }
  }

  // --- firing ---
  p.fireCd -= dt;
  if (controls.firing && p.fireCd <= 0) {
    p.fireCd = p.fireInterval;
    const n = p.multishot;
    for (let i = 0; i < n; i++) {
      const spread = n === 1 ? 0 : (i - (n - 1) / 2) * 0.11;
      const a = p.angle + spread;
      world.bullets.push({
        x: p.x + Math.cos(p.angle) * 18,
        y: p.y + Math.sin(p.angle) * 18,
        vx: Math.cos(a) * PLAYER.bulletSpeed,
        vy: Math.sin(a) * PLAYER.bulletSpeed,
        damage: p.damage,
        pierce: p.pierce,
        life: 0.9,
      });
    }
    burst(world, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, '#ffe066', 2, 90, 2);
    audio.shoot();
  }

  // --- bullets ---
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < WIDTH + 20 && b.y > -20 && b.y < HEIGHT + 20);
  for (const b of world.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 3) {
      b.life = 0;
      hurtPlayer(world, audio);
    }
  }
  world.enemyBullets = world.enemyBullets.filter((b) => b.life > 0);

  // --- enemies ---
  const waveSpeed = 1 + world.wave * 0.03;
  for (const e of world.enemies) {
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt * 6);
    if (e.spawnIn > 0) {
      e.spawnIn -= dt;
      continue;
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    if (e.kind === 'drifter') {
      const sp = 96 * waveSpeed;
      e.vx += (ux * sp - e.vx) * Math.min(1, dt * 3);
      e.vy += (uy * sp - e.vy) * Math.min(1, dt * 3);
    } else if (e.kind === 'darter') {
      e.lungeCd -= dt;
      if (e.lungeTime > 0) {
        e.lungeTime -= dt;
      } else if (e.lungeCd <= 0 && d < 330) {
        e.lungeTime = 0.42;
        e.lungeCd = range(world.rng, 1.8, 2.6);
        e.vx = ux * 430;
        e.vy = uy * 430;
      } else {
        const sp = 120 * waveSpeed;
        e.vx += (ux * sp - e.vx) * Math.min(1, dt * 4);
        e.vy += (uy * sp - e.vy) * Math.min(1, dt * 4);
      }
    } else if (e.kind === 'orbiter') {
      const want = 235;
      const radial = (d - want) * 1.6;
      const tx = -uy * e.strafeDir;
      const ty = ux * e.strafeDir;
      e.vx += (ux * radial + tx * 120 - e.vx) * Math.min(1, dt * 3);
      e.vy += (uy * radial + ty * 120 - e.vy) * Math.min(1, dt * 3);
      e.fireCd -= dt;
      if (e.fireCd <= 0 && d < 430) {
        e.fireCd = 2.6;
        world.enemyBullets.push({ x: e.x, y: e.y, vx: ux * 245, vy: uy * 245, radius: 6, life: 3.2 });
      }
    } else {
      const sp = 52 * waveSpeed;
      e.vx += (ux * sp - e.vx) * Math.min(1, dt * 2);
      e.vy += (uy * sp - e.vy) * Math.min(1, dt * 2);
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (d < e.radius + p.radius - 2) hurtPlayer(world, audio);
  }

  // --- bullet hits ---
  for (const b of world.bullets) {
    if (b.life <= 0) continue;
    for (const e of world.enemies) {
      if (e.hp <= 0 || e.spawnIn > 0) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 4) {
        e.hp -= b.damage;
        e.flash = 1;
        burst(world, b.x, b.y, '#ffe066', 3, 140, 2);
        if (e.hp <= 0) killEnemy(world, e, audio);
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          b.life = 0;
        }
        break;
      }
    }
  }
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // --- pickups ---
  for (const s of world.pickups) {
    s.t += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= Math.pow(0.02, dt);
    s.vy *= Math.pow(0.02, dt);
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < p.magnet) {
      s.vx += (dx / d) * 1500 * dt;
      s.vy += (dy / d) * 1500 * dt;
    }
    if (d < p.radius + 11) {
      s.t = 9999;
      if (s.kind === 'shard') {
        world.score += 10 * comboMultiplier(world);
        world.comboTimer = Math.max(world.comboTimer, 1.2);
        audio.pickup();
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 1);
        addText(world, p.x, p.y - 24, '+1 HULL', '#ff6b9d', 16);
        audio.upgrade();
      }
    }
  }
  world.pickups = world.pickups.filter((s) => s.t < 14);

  // --- combo, particles, texts ---
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }
  for (const pt of world.particles) {
    pt.life += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.pow(0.05, dt);
    pt.vy *= Math.pow(0.05, dt);
  }
  world.particles = world.particles.filter((pt) => pt.life < pt.maxLife);
  for (const t of world.texts) {
    t.life += dt;
    t.y -= 34 * dt;
  }
  world.texts = world.texts.filter((t) => t.life < t.maxLife);
  world.shake = Math.max(0, world.shake - dt * 26);

  // --- wave / game state ---
  if (world.phase === 'fighting' && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.phase = 'cleared';
    events.push('waveclear');
    if (world.wave >= VICTORY_WAVE && !world.victoryShown) {
      world.victoryShown = true;
      events.push('victory');
    }
    audio.waveClear();
  }
  if (p.hp <= 0) events.push('gameover');
  return events;
}

/** Three distinct upgrade choices for a cleared wave. */
export function rollUpgrades(world) {
  const pool = UPGRADES.filter((u) => {
    if (u.id === 'multi') return world.player.multishot < 4;
    return true;
  });
  const chosen = [];
  const copy = [...pool];
  while (chosen.length < 3 && copy.length > 0) {
    const i = Math.floor(world.rng() * copy.length);
    chosen.push(copy.splice(i, 1)[0]);
  }
  return chosen;
}
