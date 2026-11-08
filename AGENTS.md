# AGENTS.md

Vanilla-JS Asteroids clone (HTML5 Canvas). No dependencies, no build system, no tests. All UI text and code comments are in Spanish — match that in new code.

## Run

- `npx serve .` → http://localhost:3000, or open `index.html` directly (`file://` works).
- There is no test/lint/typecheck tooling. Verification is manual, in the browser.

## Structure

- `index.html` — 800×600 `<canvas>` + inline styles; loads `game.js` via a plain `<script>` tag.
- `game.js` — the entire game (~904 lines): input, entities (`Bullet`, `Asteroid`, `Ship`, `Particle`, `Powerup`, `EstrellaFugaz`), skins, collision, `update`/`draw`, main loop.
- Game flow is driven by a string `state` machine: `'menu' | 'playing' | 'dead' | 'gameover'`.

## Gotchas

- **Canvas size is hardcoded in two places**: `W`/`H` in `game.js` (800/600) must match the `width`/`height` attributes on the canvas in `index.html`. There is no resize handling.
- **Keep `game.js` module-free** (no `import`/`export`). It's loaded via a plain script tag and the "open index.html directly" workflow breaks with ES modules on `file://`.
- **`pressed(code)` is consume-on-read**: it clears the `justPressed` flag, so only one call per key per frame returns `true`. Don't poll it from multiple places.
- **Tuning lives in data tables**: `RADII`/`SPEEDS`/`POINTS` arrays near the top of `game.js` are indexed by asteroid size 1–3; ship constants (`ROT`, `THRUST`, `DRAG`) are inline in `Ship.update`; power-up tuning (`POWERUP_*` and `ESCUDO_*`) sits above the `Powerup` class; star tuning (`ESTRELLA_*`) sits above the `EstrellaFugaz` class; the ship skins table (`SKINS`) sits above the `Ship` class.
- **Power-up types**: `Powerup.tipo` is `'velocidad' | 'escudo' | 'triple'`; the drop table lives in `maybeDrop()` (uniform 1/3) and each type has its own color/icon in `Powerup.draw()`. The shield is energy-based (`ESCUDO_*`, active while Shift is held), speed and triple are timed (`POWERUP_TIME`), and `killShip()` resets all three.
- **Skins are cosmetic only**: `SKINS` defines each hull as `verts` (nose toward +x) plus colors; `drawNave()` is the single renderer used by the ship, the life icons and the menu preview. The collision radius stays at 12. The chosen index persists in `localStorage` under `'asteroids-skin'` (wrapped in `try/catch` for `file://`).
- **Shooting stars live in their own `specials` array** (not in `asteroids`) so the level-complete check (`asteroids.length === 0`) is not blocked by a star that is still flying.
