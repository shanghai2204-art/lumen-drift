// Lumen Drift — the hand-in program for best-game-01 (Node 22, standard
// library only). The game itself is the static game/ folder beside this
// file; this program copies game/ and screenshots/ into the output
// directory and writes dossier.json with the vendored make.fun library,
// byte for byte as the scorer rebuilds it. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message: string): never {
  process.stderr.write(`lumen drift: ${message}\n`);
  process.exit(1);
}

if (!existsSync(join(here, 'game', 'index.html'))) fail('game/index.html is missing: the game must live in game/');
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')) : [];
if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} files: hand in 3 or 4`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The gate's caps, mirrored from the competition's scorer.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

process.stdout.write(`lumen drift: game and ${shots.length} screenshots handed in\n`);
