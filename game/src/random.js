// A tiny seeded random generator (mulberry32). The demo and the screenshot
// scenes run on a fixed seed, so the same scene renders the same way on
// every machine; live play seeds from the clock instead.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
