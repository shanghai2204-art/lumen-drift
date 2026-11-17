// The autopilot: a simple pilot that flies the attract demo behind the
// title screen and the screenshot scenes. It steers away from the nearest
// threats, aims at the closest enemy, fires in range and dashes out of
// corners — good enough to look alive, mortal enough to stay honest.

export function botControls(world) {
  const p = world.player;
  const aim = { x: p.x + 100, y: p.y };
  let threatX = 0;
  let threatY = 0;
  let nearest = null;
  let nearestDist = Infinity;

  for (const e of world.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 190) {
      const w = (190 - d) / 190;
      threatX += (dx / d) * w;
      threatY += (dy / d) * w;
    }
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }
  for (const b of world.enemyBullets) {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 120) {
      threatX += (dx / d) * 0.7;
      threatY += (dy / d) * 0.7;
    }
  }

  // Drift toward the richest shard cluster when nothing is close.
  let goalX = 640;
  let goalY = 400;
  let best = -1;
  for (const s of world.pickups) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    const score = s.kind === 'heart' ? 3 : 1;
    if (score - d / 900 > best) {
      best = score - d / 900;
      goalX = s.x;
      goalY = s.y;
    }
  }

  let mx = threatX * 1.6 + (goalX - p.x) / 500;
  let my = threatY * 1.6 + (goalY - p.y) / 500;
  // Keep off the walls.
  if (p.x < 90) mx += 1.2;
  if (p.x > 1190) mx -= 1.2;
  if (p.y < 90) my += 1.2;
  if (p.y > 710) my -= 1.2;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  if (nearest) {
    aim.x = nearest.x;
    aim.y = nearest.y;
  }
  const crowded = world.enemies.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 95);
  return {
    move: { x: mx, y: my },
    aim,
    firing: nearestDist < 430,
    dash: crowded && p.dashCd <= 0,
  };
}
