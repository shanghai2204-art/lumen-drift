// Lumen Drift — shared tuning: arena, palette and the numbers every other
// module reads. One place to balance the game from.

export const WIDTH = 1280;
export const HEIGHT = 800;

export const COLORS = {
  bg: '#070b16',
  bgDeep: '#04060d',
  grid: 'rgba(94, 140, 255, 0.07)',
  player: '#7df9ff',
  playerCore: '#eaffff',
  bullet: '#ffe066',
  shard: '#69f0ae',
  heart: '#ff6b9d',
  hull: '#ff5d5d',
  hullBg: 'rgba(255, 93, 93, 0.18)',
  shield: '#7db4ff',
  text: '#dfe9ff',
  dim: '#8494b8',
  accent: '#ffb84d',
};

export const ENEMY_STYLE = {
  drifter: { color: '#ff6b81', radius: 16 },
  darter: { color: '#ffa94d', radius: 11 },
  orbiter: { color: '#c77dff', radius: 14 },
  splitter: { color: '#ff477e', radius: 27 },
};

export const PLAYER = {
  radius: 13,
  speed: 265,
  maxHp: 5,
  fireInterval: 0.21,
  bulletSpeed: 640,
  bulletDamage: 1,
  dashTime: 0.22,
  dashCooldown: 1.6,
  dashSpeed: 880,
  invulnTime: 0.9,
};

export const VICTORY_WAVE = 10;
