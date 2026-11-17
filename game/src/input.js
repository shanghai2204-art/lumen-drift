// Keyboard and mouse state, read once per frame by the game loop. The
// canvas is a fixed 1280x800 stage scaled by CSS, so pointer positions are
// mapped back into stage coordinates here.

import { WIDTH, HEIGHT } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: WIDTH / 2, y: HEIGHT / 3, down: false };
  let pressed = new Set();

  function toStage(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (event) => {
    const p = toStage(event);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toStage(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    pressed.add('PointerDown');
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  return {
    keys,
    mouse,
    /** Was this code newly pressed since the last frame? */
    takePressed(code) {
      const hit = pressed.has(code);
      if (hit) pressed.delete(code);
      return hit;
    },
    clearPressed() {
      pressed = new Set();
    },
    moveAxis() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = Math.SQRT1_2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
  };
}
