'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, color = '#fff') {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define nombre, color del casco, color de la llama, el punto de
// salida de la llama (llamaX) y la silueta (verts, con la nariz hacia +x).
// "detalles" son líneas extra opcionales (cabina, etc.). Todo es cosmético:
// el radio de colisión de la nave no cambia.
const SKINS = [
  {
    nombre: 'Clásica', color: '#fff', llama: 'rgba(255, 130, 0, 0.85)', llamaX: -8,
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    nombre: 'Caza', color: '#4fd8ff', llama: 'rgba(80, 255, 150, 0.9)', llamaX: -7,
    verts: [[22, 0], [2, -5], [-12, -8], [-7, 0], [-12, 8], [2, 5]],
  },
  {
    nombre: 'Orbital', color: '#ffd24a', llama: 'rgba(255, 190, 60, 0.9)', llamaX: -14,
    verts: [[15, 0], [7, -10], [-7, -10], [-15, 0], [-7, 10], [7, 10]],
    detalles: [[[5, -4], [11, 0], [5, 4]]],
  },
  {
    nombre: 'Fénix', color: '#ff5a3c', llama: 'rgba(255, 220, 60, 0.9)', llamaX: -11,
    verts: [[20, 0], [-4, -7], [-16, -13], [-11, 0], [-16, 13], [-4, 7]],
  },
  {
    nombre: 'Espectro', color: '#d46bff', llama: 'rgba(190, 90, 255, 0.9)', llamaX: -14,
    verts: [[24, 0], [-6, -4], [-14, 0], [-6, 4]],
  },
];

const SKIN_KEY = 'asteroids-skin';

function cargarSkin() {
  try {
    const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
    return Number.isInteger(i) && i >= 0 && i < SKINS.length ? i : 0;
  } catch (e) {
    return 0;   // localStorage puede fallar en file://
  }
}

function guardarSkin() {
  try { localStorage.setItem(SKIN_KEY, String(skinIndex)); } catch (e) { /* ignorar */ }
}

let skinIndex = cargarSkin();

// Dibuja la nave del skin dado. La llama es opcional y puede recibir un color
// que reemplaza el del skin (usado por el power-up de velocidad).
function drawNave(skin, x, y, angle, scale = 1, llama = false, llamaColor = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = skin.color;
  // El grosor se compensa por la escala para que se vea igual en todos lados
  ctx.lineWidth = 1.5 / scale;
  ctx.lineJoin  = 'round';

  // Casco
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();

  // Detalles extra (cabina, etc.)
  if (skin.detalles) {
    ctx.lineWidth = 1 / scale;
    for (const linea of skin.detalles) {
      ctx.beginPath();
      ctx.moveTo(linea[0][0], linea[0][1]);
      for (let i = 1; i < linea.length; i++)
        ctx.lineTo(linea[i][0], linea[i][1]);
      ctx.stroke();
    }
  }

  // Llama del propulsor
  if (llama) {
    ctx.beginPath();
    ctx.moveTo(skin.llamaX, -4);
    ctx.lineTo(skin.llamaX - rand(6, 14), 0);
    ctx.lineTo(skin.llamaX, 4);
    ctx.strokeStyle = llamaColor || skin.llama;
    ctx.lineWidth   = 1.5 / scale;
    ctx.stroke();
  }

  ctx.restore();
}

function cambiarSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  guardarSkin();
  skinMsgTtl = 1.5;
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.shieldEnergy  = 0;
    this.shieldActive  = false;
    this.tripleShot    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    // Escudo: se mantiene con Shift mientras quede energía
    this.shieldActive = !!(keys['ShiftLeft'] || keys['ShiftRight']) && this.shieldEnergy > 0;
    if (this.shieldActive) {
      this.shieldEnergy -= ESCUDO_DRAIN * dt;
      if (this.shieldEnergy <= 0) {
        this.shieldEnergy = 0;
        this.shieldActive = false;
      }
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    // Empuje duplicado mientras dura el power-up de velocidad
    const thrust = this.speedBoost > 0 ? THRUST * POWERUP_MULT : THRUST;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Con el power-up de triple disparo: abanico de 3 balas
    if (this.tripleShot > 0) {
      const SPREAD = 0.13;  // rad (~7.5°) entre balas del abanico
      return [
        new Bullet(ox, oy, this.angle - SPREAD, '#7cffb2'),
        new Bullet(ox, oy, this.angle,          '#7cffb2'),
        new Bullet(ox, oy, this.angle + SPREAD, '#7cffb2'),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    // Burbuja del escudo (se dibuja aunque el casco parpadee por invencibilidad)
    if (this.shieldActive) {
      const parpadea = this.shieldEnergy < 25 && Math.floor(this.shieldEnergy * 8) % 2 === 0;
      if (!parpadea) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = 'rgba(74, 224, 255, 0.9)';
        ctx.fillStyle   = 'rgba(74, 224, 255, 0.10)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, ESCUDO_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin  = SKINS[skinIndex];
    const llama = this.thrusting && Math.random() > 0.35;
    // El power-up de velocidad tiñe la llama de cian
    const llamaColor = this.speedBoost > 0 ? 'rgba(0, 200, 255, 0.9)' : null;
    drawNave(skin, this.x, this.y, this.angle, 1, llama, llamaColor);
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups (velocidad, escudo y triple disparo) ────────────────────────────
const POWERUP_DROP = 0.12;  // probabilidad de soltar al destruir un asteroide
const POWERUP_TTL  = 9;     // segundos que el ítem flota antes de desaparecer
const POWERUP_TIME = 5;     // duración de los efectos temporales
const POWERUP_MULT = 2;     // multiplicador de empuje

// Escudo
const ESCUDO_MAX    = 100;  // energía máxima
const ESCUDO_GAIN   = 60;   // energía que aporta cada ítem recogido
const ESCUDO_DRAIN  = 20;   // energía consumida por segundo activo
const ESCUDO_RADIUS = 26;   // radio de la burbuja

class Powerup {
  constructor(x, y, tipo = 'velocidad') {
    this.x = x;
    this.y = y;
    this.tipo = tipo;
    this.radius = 12;
    this.ttl  = POWERUP_TTL;
    this.rot  = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1.5, 1.5);
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo antes de expirar
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.tipo === 'escudo' ? '#4ae0ff'
                    : this.tipo === 'triple' ? '#7cffb2'
                    : '#ffd24a';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Rombo
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.stroke();

    // Icono según el tipo: 3 rayitas (triple), círculo (escudo) o chevrón (velocidad)
    if (this.tipo === 'triple') {
      for (const dx of [-4, 0, 4]) {
        ctx.beginPath();
        ctx.moveTo(dx, -3);
        ctx.lineTo(dx, 3);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      if (this.tipo === 'escudo') {
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
      } else {
        ctx.moveTo(-4, -4);
        ctx.lineTo(1, 0);
        ctx.lineTo(-4, 4);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial) ────────────────────────────────────────
const ESTRELLA_SPEED  = 300;             // px/s (~3× el asteroide más veloz)
const ESTRELLA_TTL    = 5;               // segundos antes de desaparecer
const ESTRELLA_POINTS = POINTS[1] * 3;   // triple de un asteroide pequeño
const ESTRELLA_MIN    = 7;               // segundos mínimos entre apariciones
const ESTRELLA_MAX    = 10;              // segundos máximos entre apariciones

class EstrellaFugaz {
  constructor() {
    // Nace en un borde aleatorio, apuntando hacia la zona central
    const borde = randInt(0, 3);
    if (borde === 0)      { this.x = rand(0, W); this.y = 0; }
    else if (borde === 1) { this.x = W - 1;      this.y = rand(0, H); }
    else if (borde === 2) { this.x = rand(0, W); this.y = H - 1; }
    else                  { this.x = 0;          this.y = rand(0, H); }

    const tx = rand(W * 0.25, W * 0.75);
    const ty = rand(H * 0.25, H * 0.75);
    const angle = Math.atan2(ty - this.y, tx - this.x);
    const speed = ESTRELLA_SPEED + rand(-40, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.radius = 16;
    this.ttl    = ESTRELLA_TTL;
    this.rot    = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-3, 3);
    this.dead = false;

    // Estrella regular de 5 puntas
    this.verts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.42;
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;

    // Estela: una partícula por frame en la posición actual
    particles.push(new Particle(this.x, this.y));

    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.dead) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, specials;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let specialTimer;
let menuRot = 0;      // rotación de la nave en el menú
let skinMsgTtl = 0;   // tiempo restante del aviso de skin en el HUD

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  specials  = [];
  specialTimer = rand(ESTRELLA_MIN, ESTRELLA_MAX);
  score  = 0;
  lives  = 3;
  level  = 1;
  skinMsgTtl = 0;
  state  = 'playing';
  spawnAsteroids(4);
}

// Prepara el menú inicial con unos asteroides decorativos de fondo
function initMenu() {
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  specials  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  menuRot = 0;
  for (let i = 0; i < 4; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < 160);
    asteroids.push(new Asteroid(x, y, randInt(2, 3)));
  }
  state = 'menu';
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  specials  = [];
  specialTimer = rand(ESTRELLA_MIN, ESTRELLA_MAX);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

// Suelta un power-up al azar (velocidad, escudo o triple disparo)
function maybeDrop(x, y) {
  if (Math.random() < POWERUP_DROP) {
    const tipo = ['velocidad', 'escudo', 'triple'][randInt(0, 2)];
    powerups.push(new Powerup(x, y, tipo));
  }
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoost   = 0;   // los power-ups se pierden al morir
  ship.shieldEnergy = 0;   // el escudo también se pierde
  ship.shieldActive = false;
  ship.tripleShot   = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Menú ──────────────────────────────────────────────────────────────────────
function updateMenu(dt) {
  menuRot += dt * 0.8;
  asteroids.forEach(a => a.update(dt));

  const izqA = pressed('ArrowLeft');
  const derA = pressed('ArrowRight');
  const izqK = pressed('KeyA');
  const derK = pressed('KeyD');
  const otra = pressed('KeyS');

  if (izqA || izqK) {
    skinIndex = (skinIndex - 1 + SKINS.length) % SKINS.length;
    guardarSkin();
  }
  if (derA || derK || otra) cambiarSkin();

  const espacio = pressed('Space');
  const enter   = pressed('Enter');
  if (espacio || enter) initGame();
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (skinMsgTtl > 0) skinMsgTtl -= dt;

  if (state === 'menu') { updateMenu(dt); return; }

  if (state === 'gameover') {
    const reiniciar = pressed('Space');
    const alMenu    = pressed('KeyM');
    const otraNave  = pressed('KeyS');
    if (reiniciar) { initGame(); return; }
    if (alMenu)    { initMenu(); return; }
    if (otraNave)  cambiarSkin();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    if (pressed('KeyS')) cambiarSkin();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups  = powerups.filter(p => !p.dead);
    specials.forEach(s => s.update(dt));
    specials  = specials.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambiar de skin en pleno juego
  if (pressed('KeyS')) cambiarSkin();

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  specials.forEach(s => s.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  specials  = specials.filter(s => !s.dead);

  // Aparición de la estrella fugaz (cadencia ~ESTRELLA_MIN–ESTRELLA_MAX s)
  specialTimer -= dt;
  if (specialTimer <= 0 && specials.length === 0) {
    specials.push(new EstrellaFugaz());
    specialTimer = rand(ESTRELLA_MIN, ESTRELLA_MAX);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // Posible power-up al destruir un asteroide
        maybeDrop(a.x, a.y);
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz (triple de puntos y no se parte)
  for (const b of bullets) {
    for (const s of specials) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += ESTRELLA_POINTS;
        explode(s.x, s.y, 14);
      }
    }
  }
  bullets  = bullets.filter(b => !b.dead);
  specials = specials.filter(s => !s.dead);

  // Nave vs power-up (se puede recoger incluso con invencibilidad activa)
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.tipo === 'escudo') {
        ship.shieldEnergy = Math.min(ESCUDO_MAX, ship.shieldEnergy + ESCUDO_GAIN);
      } else if (p.tipo === 'triple') {
        ship.tripleShot = POWERUP_TIME;
      } else {
        ship.speedBoost = POWERUP_TIME;
      }
      explode(p.x, p.y, 10);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide / estrella fugaz
  if (ship.shieldActive) {
    // El escudo destruye lo que toca la burbuja (como si lo dispararas)
    const restos = [];
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ESCUDO_RADIUS + a.radius) {
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        restos.push(...a.split());
        maybeDrop(a.x, a.y);
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(restos);

    for (const s of specials) {
      if (!s.dead && dist(ship, s) < ESCUDO_RADIUS + s.radius) {
        s.dead = true;
        score += ESTRELLA_POINTS;
        explode(s.x, s.y, 14);
      }
    }
    specials = specials.filter(s => !s.dead);
  } else if (ship.invincible <= 0) {
    for (const a of asteroids.concat(specials)) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  // Mini-nave con el skin actual, mirando hacia arriba
  drawNave(SKINS[skinIndex], x, y, -Math.PI / 2, 0.45, false);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-ups activos (se apilan si hay más de uno)
  let hudY = 48;
  if (ship.speedBoost > 0) {
    ctx.fillStyle = '#ffd24a';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`VELOCIDAD ×2  ${ship.speedBoost.toFixed(1)}s`, W / 2, hudY);
    hudY += 18;
  }
  if (ship.tripleShot > 0) {
    ctx.fillStyle = '#7cffb2';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`TRIPLE  ${ship.tripleShot.toFixed(1)}s`, W / 2, hudY);
    hudY += 18;
  }

  // Barra de energía del escudo (abajo a la izquierda)
  if (ship.shieldEnergy > 0) {
    const barW = 120, barH = 8;
    const barX = 14, barY = H - 26;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4ae0ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('ESCUDO  [SHIFT]', barX, barY - 8);
    ctx.strokeStyle = 'rgba(74, 224, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = ship.shieldActive ? '#4ae0ff' : 'rgba(74, 224, 255, 0.45)';
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * (ship.shieldEnergy / ESCUDO_MAX), barH - 2);
  }

  // Aviso del skin al cambiarlo en pleno juego (debajo de los indicadores activos)
  if (skinMsgTtl > 0) {
    ctx.fillStyle = SKINS[skinIndex].color;
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`NAVE: ${SKINS[skinIndex].nombre.toUpperCase()}`, W / 2, hudY);
  }
}

function drawOverlay(title, sub, sub2) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
  if (sub2) {
    ctx.font = '15px monospace';
    ctx.fillText(sub2, W / 2, H / 2 + 50);
  }
}

function drawMenu() {
  asteroids.forEach(a => a.draw());

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 52px monospace';
  ctx.fillText('ASTEROIDS', W / 2, H / 2 - 130);

  // Vista previa de la nave elegida
  const skin = SKINS[skinIndex];
  drawNave(skin, W / 2, H / 2 - 10, menuRot, 1.6, true);

  ctx.fillStyle = skin.color;
  ctx.font      = 'bold 24px monospace';
  ctx.fillText(skin.nombre.toUpperCase(), W / 2, H / 2 + 80);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font      = '14px monospace';
  ctx.fillText(`${skinIndex + 1} / ${SKINS.length}`, W / 2, H / 2 + 106);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = '16px monospace';
  ctx.fillText('← →  CAMBIAR NAVE', W / 2, H / 2 + 160);
  ctx.fillText('ESPACIO PARA EMPEZAR', W / 2, H / 2 + 188);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'menu') { drawMenu(); return; }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  specials.forEach(s => s.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}`, 'ESPACIO: REINICIAR   —   M: MENÚ');
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initMenu();
requestAnimationFrame(loop);
