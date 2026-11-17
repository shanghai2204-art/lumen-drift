// Every pixel the game draws: the arena, the entities, the HUD and the
// screens. The world module never touches the canvas; this module never
// changes the world.

import { WIDTH, HEIGHT, COLORS, ENEMY_STYLE } from './config.js';
import { comboMultiplier } from './world.js';
import { mulberry32 } from './random.js';

let stars = null;
function starfield() {
  if (stars) return stars;
  const rng = mulberry32(42);
  stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({ x: rng() * WIDTH, y: rng() * HEIGHT, r: rng() * 1.6 + 0.4, tw: rng() * 6.28, depth: 0.3 + rng() * 0.7 });
  }
  return stars;
}

function poly(ctx, x, y, radius, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawScene(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  g.addColorStop(0, COLORS.bg);
  g.addColorStop(1, COLORS.bgDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Drift-grid.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const off = (world.time * 6) % 64;
  for (let x = -64 + off; x < WIDTH; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
  }
  for (let y = 0; y < HEIGHT; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
  }
  ctx.stroke();

  for (const s of starfield()) {
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(world.time * 1.7 + s.tw));
    ctx.globalAlpha = a * s.depth;
    ctx.fillStyle = '#cfe4ff';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // Arena rim.
  ctx.strokeStyle = 'rgba(125, 249, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, WIDTH - 12, HEIGHT - 12);

  // Pickups.
  for (const s of world.pickups) {
    const bob = Math.sin(world.time * 5 + s.x) * 2;
    if (s.kind === 'shard') {
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.shard;
      ctx.shadowColor = COLORS.shard;
      ctx.shadowBlur = 10;
      ctx.fillRect(-4.5, -4.5, 9, 9);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      ctx.fillStyle = COLORS.heart;
      ctx.shadowColor = COLORS.heart;
      ctx.shadowBlur = 12;
      poly(ctx, 0, 0, 9, 6, world.time * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Enemy bolts.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.enemyBullets) {
    ctx.fillStyle = '#e599f7';
    ctx.shadowColor = '#e599f7';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Enemies.
  for (const e of world.enemies) {
    const style = ENEMY_STYLE[e.kind];
    const scale = e.spawnIn > 0 ? 1 - e.spawnIn * 1.6 : 1;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(Math.max(0.2, scale), Math.max(0.2, scale));
    ctx.globalAlpha = e.spawnIn > 0 ? 0.45 : 1;
    ctx.strokeStyle = e.flash > 0 ? '#ffffff' : style.color;
    ctx.fillStyle = e.flash > 0 ? 'rgba(255,255,255,0.85)' : style.color + '33';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 14;
    const p = world.player;
    if (e.kind === 'drifter') {
      poly(ctx, 0, 0, e.radius, 4, e.t * 1.4);
      ctx.fill();
      ctx.stroke();
    } else if (e.kind === 'darter') {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.rotate(a);
      const stretch = e.lungeTime > 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.5 * stretch, 0);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (e.kind === 'orbiter') {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.45, e.t * 3, e.t * 3 + Math.PI * 1.4);
      ctx.stroke();
    } else {
      poly(ctx, 0, 0, e.radius, 6, e.t * 0.7);
      ctx.fill();
      ctx.stroke();
      poly(ctx, 0, 0, e.radius * 0.45, 6, -e.t * 1.1);
      ctx.stroke();
    }
    ctx.restore();
    if (e.maxHp > 2 && e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2, 3.5);
      ctx.fillStyle = style.color;
      ctx.fillRect(e.x - e.radius, e.y - e.radius - 10, e.radius * 2 * (e.hp / e.maxHp), 3.5);
    }
  }

  // Bullets.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of world.bullets) {
    ctx.strokeStyle = COLORS.bullet;
    ctx.lineWidth = 3.4;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Particles.
  for (const pt of world.particles) {
    const a = 1 - pt.life / pt.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * a + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  drawPlayer(ctx, world);

  // Floating score text.
  for (const t of world.texts) {
    const a = 1 - t.life / t.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = t.color;
    ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0 && p.dashTime <= 0) {
    // Blink while invulnerable.
  } else {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#0e2a33';
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(-11, 11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-11, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.arc(3, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    // Engine flame.
    const flame = 7 + Math.sin(world.time * 31) * 2.5 + (p.dashTime > 0 ? 12 : 0);
    ctx.fillStyle = 'rgba(125, 249, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-11, 3.4);
    ctx.lineTo(-11 - flame, 0);
    ctx.lineTo(-11, -3.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (p.shield > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(125, 180, 255, ${0.35 + 0.2 * Math.sin(world.time * 4)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function bar(ctx, x, y, w, frac, color, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, 9);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 9);
}

export function drawHUD(ctx, world, opts) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 27px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(world.score).padStart(6, '0'), 22, 40);
  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('SCORE', 23, 58);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, world.wave)}`, WIDTH / 2, 38);
  if (world.wave >= 10 && !world.victoryShown) {
    ctx.fillStyle = COLORS.accent;
    ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`CLEAR WAVE ${10} TO WIN`, WIDTH / 2, 58);
  }

  // Combo.
  const mult = comboMultiplier(world);
  if (world.combo > 1) {
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.accent;
    ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`x${mult} COMBO`, WIDTH - 22, 40);
    bar(ctx, WIDTH - 162, 48, 140, world.comboTimer / 2.5, COLORS.accent, 'rgba(255,184,77,0.18)');
  }

  // Hull + shield pips, bottom-left.
  let x = 22;
  ctx.textAlign = 'left';
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText('HULL', x, HEIGHT - 40);
  x += 38;
  for (let i = 0; i < p.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? COLORS.hull : COLORS.hullBg;
    ctx.fillRect(x + i * 17, HEIGHT - 50, 13, 12);
  }
  if (p.maxShield > 0) {
    x += p.maxHp * 17 + 12;
    ctx.fillStyle = COLORS.dim;
    ctx.fillText('SHIELD', x, HEIGHT - 40);
    x += 48;
    for (let i = 0; i < p.maxShield; i++) {
      ctx.fillStyle = i < p.shield ? COLORS.shield : 'rgba(125,180,255,0.18)';
      ctx.fillRect(x + i * 17, HEIGHT - 50, 13, 12);
    }
  }

  // Dash cooldown, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.dim;
  ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('DASH', WIDTH - 118, HEIGHT - 40);
  bar(ctx, WIDTH - 108, HEIGHT - 50, 86, 1 - p.dashCd / Math.max(0.01, p.dashCooldown), COLORS.player, 'rgba(125,249,255,0.15)');

  ctx.fillStyle = 'rgba(132, 148, 184, 0.8)';
  ctx.font = '500 12.5px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opts.muted ? 'M — sound off' : 'M — sound on', WIDTH / 2, HEIGHT - 14);
  ctx.textAlign = 'left';
}

function panel(ctx, w, h) {
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  ctx.fillStyle = 'rgba(5, 9, 20, 0.82)';
  ctx.strokeStyle = 'rgba(125, 249, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  return { x, y };
}

export function drawTitle(ctx, world) {
  const { x, y } = panel(ctx, 720, 430);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.player;
  ctx.font = '800 76px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = COLORS.player;
  ctx.shadowBlur = 26;
  ctx.fillText('LUMEN DRIFT', WIDTH / 2, y + 108);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.text;
  ctx.font = '500 19px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Hold the arena against the swarm. Survive ten waves to win —', WIDTH / 2, y + 152);
  ctx.fillText('then drift as long as you can.', WIDTH / 2, y + 178);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '500 16.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move        Mouse — aim        Hold click / Space — fire', WIDTH / 2, y + 232);
  ctx.fillText('Shift — dash (brief immunity)        P — pause        M — mute', WIDTH / 2, y + 260);
  ctx.fillText('Collect lumen shards to build your combo. Pick an upgrade after each wave.', WIDTH / 2, y + 288);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '800 24px "Segoe UI", system-ui, sans-serif';
  const pulse = 0.75 + 0.25 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY', WIDTH / 2, y + 356);
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.dim;
  ctx.font = '500 13.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Demo playing behind this panel — the swarm does not wait.', WIDTH / 2, y + 392);
  void x;
}

export function drawUpgrade(ctx, world, choices, hover) {
  ctx.fillStyle = 'rgba(3, 5, 12, 0.55)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '800 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} CLEAR`, WIDTH / 2, 218);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '600 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Choose an upgrade — click a card or press 1, 2, 3', WIDTH / 2, 252);
  const w = 300;
  const h = 168;
  const gap = 26;
  const total = w * 3 + gap * 2;
  const x0 = (WIDTH - total) / 2;
  const y0 = 300;
  choices.forEach((u, i) => {
    const x = x0 + i * (w + gap);
    ctx.fillStyle = hover === i ? 'rgba(24, 40, 66, 0.95)' : 'rgba(13, 22, 40, 0.95)';
    ctx.strokeStyle = hover === i ? COLORS.accent : 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = hover === i ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.roundRect(x, y0, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.accent;
    ctx.font = '800 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(i + 1), x + w / 2, y0 + 44);
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.name, x + w / 2, y0 + 86);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '500 15.5px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.desc, x + w / 2, y0 + 118);
  });
  return { x0, y0, w, h, gap };
}

export function drawGameOver(ctx, world, best) {
  const { y } = panel(ctx, 560, 380);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.hull;
  ctx.font = '800 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(world.victoryShown ? 'DRIFT ENDED' : 'SHIP LOST', WIDTH / 2, y + 92);
  if (world.victoryShown) {
    ctx.fillStyle = COLORS.accent;
    ctx.font = '700 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('You outlasted the swarm — victory at wave 10.', WIDTH / 2, y + 128);
  }
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 30px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`Score  ${world.score}`, WIDTH / 2, y + 178);
  ctx.font = '500 18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`Wave reached  ${world.wave}      Kills  ${world.kills}`, WIDTH / 2, y + 216);
  ctx.fillText(`Best score  ${Math.max(best, world.score)}`, WIDTH / 2, y + 248);
  ctx.fillStyle = COLORS.accent;
  ctx.font = '800 21px "Segoe UI", system-ui, sans-serif';
  const pulse = 0.75 + 0.25 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY AGAIN', WIDTH / 2, y + 316);
  ctx.globalAlpha = 1;
}

export function drawBanner(ctx, world, text) {
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.accent;
  ctx.font = '800 44px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = COLORS.accent;
  ctx.shadowBlur = 22;
  ctx.fillText(text, WIDTH / 2, 150);
  ctx.shadowBlur = 0;
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(3, 5, 12, 0.6)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '800 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('PAUSED', WIDTH / 2, HEIGHT / 2);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '500 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Press P to resume', WIDTH / 2, HEIGHT / 2 + 36);
}
