import * as THREE from 'three';
import { cv } from './cv-data.js';

const ISLAND_RADIUS = 34;
const STATION_RADIUS = 20;
const TRIGGER_DIST = 4.2;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
$('hud-name').textContent = cv.name;
$('intro-name').textContent = cv.name;
$('intro-role').textContent = cv.title;
$('hud-cv').href = cv.cvFile;

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fd3f5');
scene.fog = new THREE.Fog('#9fd3f5', 60, 140);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 40, 60);

scene.add(new THREE.HemisphereLight('#ffffff', '#6a8f5a', 1.2));
const sun = new THREE.DirectionalLight('#fff2dd', 2.2);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 150 });
scene.add(sun);

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });

// ---------- World ----------
const water = new THREE.Mesh(new THREE.CircleGeometry(300, 64), flat('#4fb3e8', { roughness: 0.3, metalness: 0.1 }));
water.rotation.x = -Math.PI / 2;
water.position.y = -1.2;
scene.add(water);

const ground = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 3, 2, 48, 1), flat('#7cc36a'));
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

const beach = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND_RADIUS + 3.2, ISLAND_RADIUS + 5, 1, 48), flat('#f1d9a0'));
beach.position.y = -1.6;
beach.receiveShadow = true;
scene.add(beach);

// Central path ring connecting the stations
const path = new THREE.Mesh(new THREE.RingGeometry(STATION_RADIUS - 1.4, STATION_RADIUS + 1.4, 96), flat('#e6d3a3'));
path.rotation.x = -Math.PI / 2;
path.position.y = 0.01;
path.receiveShadow = true;
scene.add(path);

// Deterministic randomness so the island looks the same every visit
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const obstacles = []; // { x, z, r }
const stationPositions = cv.stations.map((_, i) => {
  const a = (i / cv.stations.length) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(Math.cos(a) * STATION_RADIUS, 0, Math.sin(a) * STATION_RADIUS);
});

const isClear = (x, z, margin) => {
  const r = Math.hypot(x, z);
  if (r < 7 || Math.abs(r - STATION_RADIUS) < 3) return false;
  return stationPositions.every((p) => Math.hypot(p.x - x, p.z - z) > margin) &&
    obstacles.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + 1.5);
};

function tree(x, z) {
  const g = new THREE.Group();
  const h = 1.5 + rand() * 1.5;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h, 6), flat('#8a5a3b'));
  trunk.position.y = h / 2;
  const leafColor = ['#3f9b4f', '#4caf50', '#2f8f46'][Math.floor(rand() * 3)];
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.35, 1.6, 7), flat(leafColor));
    cone.position.y = h + i * 0.8;
    g.add(cone);
  }
  g.add(trunk);
  g.traverse((m) => { m.castShadow = true; });
  g.position.set(x, 0, z);
  g.rotation.y = rand() * Math.PI;
  scene.add(g);
  obstacles.push({ x, z, r: 1 });
}

function rock(x, z) {
  const s = 0.5 + rand() * 0.8;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), flat('#9aa3ad'));
  m.position.set(x, s * 0.5, z);
  m.rotation.set(rand(), rand(), rand());
  m.castShadow = true;
  scene.add(m);
  obstacles.push({ x, z, r: s });
}

for (let i = 0, placed = 0; i < 400 && placed < 45; i++) {
  const a = rand() * Math.PI * 2;
  const r = 6 + rand() * (ISLAND_RADIUS - 8);
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (!isClear(x, z, 6)) continue;
  (rand() < 0.75 ? tree : rock)(x, z);
  placed++;
}

// Clouds
const clouds = [];
for (let i = 0; i < 8; i++) {
  const c = new THREE.Group();
  for (let j = 0; j < 4; j++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rand() * 1.5, 0), flat('#ffffff', { roughness: 1 }));
    puff.position.set(j * 2.2 - 3, rand(), rand() * 1.5);
    c.add(puff);
  }
  c.position.set((rand() - 0.5) * 140, 18 + rand() * 8, (rand() - 0.5) * 140);
  c.userData.speed = 1 + rand() * 1.5;
  scene.add(c);
  clouds.push(c);
}

// ---------- Labels ----------
function makeLabel(text, color, scale = 1) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '800 64px Poppins, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 60;
  canvas.width = w;
  canvas.height = 110;
  ctx.font = font;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, 102, 50);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 58);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  sprite.scale.set((w / 110) * 1.1 * scale, 1.1 * scale, 1);
  return sprite;
}

// ---------- Stations ----------
const shapeGeometry = {
  torus: () => new THREE.TorusGeometry(1, 0.38, 10, 24),
  cone: () => new THREE.ConeGeometry(1.2, 2, 3),
  box: () => new THREE.BoxGeometry(1.6, 1.6, 1.6),
  octa: () => new THREE.OctahedronGeometry(1.3),
  ico: () => new THREE.IcosahedronGeometry(1.3),
  knot: () => new THREE.TorusKnotGeometry(0.8, 0.26, 64, 8),
};

const stations = cv.stations.map((data, i) => {
  const pos = stationPositions[i];
  const color = new THREE.Color(data.color);
  const g = new THREE.Group();
  g.position.copy(pos);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.4, 24), flat('#ffffff'));
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  g.add(pad);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.12, 8, 48),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.45;
  g.add(ring);

  const icon = new THREE.Mesh(
    (shapeGeometry[data.shape] || shapeGeometry.ico)(),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, flatShading: true, roughness: 0.4 }),
  );
  icon.position.y = 3;
  icon.castShadow = true;
  g.add(icon);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 3.2;
  g.add(beam);

  const label = makeLabel(data.label, data.color);
  label.position.y = 5.4;
  g.add(label);

  scene.add(g);
  obstacles.push({ x: pos.x, z: pos.z, r: 0.01, station: true });
  return { data, group: g, icon, ring, beam, pos, visited: false, inside: false };
});

// Name floating over the centre of the island
const title = makeLabel(cv.name.toUpperCase(), '#1d2433', 2.2);
title.material.transparent = true;
title.position.set(0, 7, 0);
scene.add(title);

const monument = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 3, 6), flat('#f4efe6'));
monument.position.y = 1.5;
monument.castShadow = true;
scene.add(monument);
obstacles.push({ x: 0, z: 0, r: 2.2 });

// ---------- Skill gems ----------
const skillNames = cv.stations.filter((s) => s.type === 'skills').flatMap((s) => s.groups.flatMap((g) => g.items));
const gemGeo = new THREE.OctahedronGeometry(0.45);
const gems = skillNames.map((name, i) => {
  let x, z, tries = 0;
  do {
    const a = rand() * Math.PI * 2;
    const r = 5 + rand() * (ISLAND_RADIUS - 8);
    x = Math.cos(a) * r; z = Math.sin(a) * r;
  } while (!isClear(x, z, 4) && ++tries < 200);
  const hue = (i / skillNames.length);
  const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
  const mesh = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, flatShading: true }));
  mesh.position.set(x, 1, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return { name, mesh, collected: false, t: 0, phase: rand() * 6 };
});

// ---------- Rover ----------
const rover = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.6), flat('#ff7a59'));
body.position.y = 0.85;
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.2), flat('#1d2433'));
cabin.position.set(0, 1.45, -0.2);
const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.1), new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#fff7c2', emissiveIntensity: 1 }));
lamp.position.set(0, 0.95, 1.31);
const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), flat('#1d2433'));
antenna.position.set(-0.6, 2, -0.9);
const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: '#ffc94a', emissive: '#ffc94a' }));
tip.position.set(-0.6, 2.6, -0.9);
rover.add(body, cabin, lamp, antenna, tip);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12);
for (const [x, z] of [[-1, 0.85], [1, 0.85], [-1, -0.85], [1, -0.85]]) {
  const w = new THREE.Mesh(wheelGeo, flat('#2b2f38'));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.45, z);
  rover.add(w);
  wheels.push(w);
}
rover.traverse((m) => { m.castShadow = true; });
rover.position.set(0, 0, 8);
scene.add(rover);

const state = { heading: 0, speed: 0, target: null };

// Click / tap target marker
const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.5, 0.8, 24),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
);
marker.rotation.x = -Math.PI / 2;
marker.position.y = 0.05;
marker.visible = false;
scene.add(marker);

// Dust particles behind the rover
const dust = [];
const dustGeo = new THREE.SphereGeometry(0.18, 5, 4);
for (let i = 0; i < 30; i++) {
  const m = new THREE.Mesh(dustGeo, new THREE.MeshBasicMaterial({ color: '#e8dcc0', transparent: true, opacity: 0 }));
  scene.add(m);
  dust.push({ m, life: 0 });
}
let dustIdx = 0, dustTimer = 0;

// ---------- Input ----------
const keys = new Set();
const keyMap = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) { keys.add(keyMap[e.code]); state.target = null; e.preventDefault(); }
  if (e.code === 'Escape') closePanel();
});
window.addEventListener('keyup', (e) => keys.delete(keyMap[e.code]));
window.addEventListener('blur', () => keys.clear());

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
renderer.domElement.addEventListener('pointerdown', (e) => {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // Clicking a station drives to it
  const hit = stations.find((s) => raycaster.intersectObject(s.group, true).length);
  if (hit) return driveTo(hit);
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, p) && Math.hypot(p.x, p.z) < ISLAND_RADIUS - 1) setTarget(p);
});

function setTarget(p) {
  state.target = p.clone();
  marker.position.set(p.x, 0.05, p.z);
  marker.visible = true;
}

function driveTo(station) {
  // Stop on the near side of the pad so we roll into the trigger zone
  const dir = rover.position.clone().sub(station.pos).setY(0).normalize();
  setTarget(station.pos.clone().add(dir.multiplyScalar(1.5)));
}

// Station quick-travel buttons (also the accessible way to reach every section)
const nav = $('stations');
stations.forEach((s) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="dot" style="background:${s.data.color}"></span>${escapeHtml(s.data.label)}`;
  b.addEventListener('click', () => { driveTo(s); openPanel(s); });
  s.button = b;
  nav.appendChild(b);
});

// ---------- Panel ----------
const panel = $('panel');
const panelBody = $('panel-body');
let openStation = null;

function renderSection(d) {
  const h = `<h2>${escapeHtml(d.label)}</h2>`;
  switch (d.type) {
    case 'text':
      return h + d.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    case 'timeline':
      return h + d.items.map((it) => `
        <div class="tl-item">
          <div class="date">${escapeHtml(it.date)}</div>
          <h3>${escapeHtml(it.title)}</h3>
          <h4>${escapeHtml(it.subtitle || '')}</h4>
          ${it.details ? `<ul>${it.details.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}
        </div>`).join('');
    case 'skills': {
      const got = new Set(gems.filter((g) => g.collected).map((g) => g.name));
      return h + `<p>Collect the gems around the island to light up each skill (${got.size}/${gems.length}).</p>` +
        d.groups.map((g) => `
          <div class="group"><h3>${escapeHtml(g.name)}</h3>
          <div class="tags">${g.items.map((x) => `<span class="tag ${got.has(x) ? 'got' : ''}">${escapeHtml(x)}</span>`).join('')}</div></div>`).join('');
    }
    case 'projects':
      return h + d.items.map((p) => `
        <div class="proj"><h3>${p.link ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>` : escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p></div>`).join('');
    case 'contact':
      return h + `<div class="contact">${d.links.map((l) => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)} →</a>`).join('')}
        <a href="${escapeHtml(cv.cvFile)}" download>Download CV →</a></div>`;
    default:
      return h;
  }
}

function openPanel(s) {
  openStation = s;
  panel.style.setProperty('--c', s.data.color);
  panelBody.innerHTML = renderSection(s.data);
  panel.classList.add('open');
  if (!s.visited) {
    s.visited = true;
    s.button.classList.add('visited');
    updateProgress();
    const all = stations.every((x) => x.visited);
    if (all) toast('🎉 You explored the whole island!');
  }
}

function closePanel() {
  panel.classList.remove('open');
  openStation = null;
}
$('panel-close').addEventListener('click', closePanel);

function updateProgress() {
  const v = stations.filter((s) => s.visited).length;
  const g = gems.filter((x) => x.collected).length;
  $('hud-progress').textContent = `${v}/${stations.length} stations · ${g}/${gems.length} skills`;
}
updateProgress();

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- Intro ----------
let started = false;
$('start').addEventListener('click', () => {
  started = true;
  $('intro').classList.add('hidden');
});

// ---------- Loop ----------
const clock = new THREE.Clock();
const camTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function update(dt, t) {
  // --- Driving input
  let throttle = 0, steer = 0;
  if (started) {
    if (keys.has('f')) throttle += 1;
    if (keys.has('b')) throttle -= 1;
    if (keys.has('l')) steer += 1;
    if (keys.has('r')) steer -= 1;
    if (state.target && !keys.size) {
      const dx = state.target.x - rover.position.x, dz = state.target.z - rover.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.8) { state.target = null; marker.visible = false; }
      else {
        const d = angleDiff(state.heading, Math.atan2(dx, dz));
        steer = THREE.MathUtils.clamp(d * 2.5, -1, 1);
        // Steer around trees/rocks that sit between us and the target
        const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
        for (const o of obstacles) {
          if (o.station) continue;
          const ox = o.x - rover.position.x, oz = o.z - rover.position.z;
          const ahead = ox * fx + oz * fz;
          const side = ox * fz - oz * fx; // >0: obstacle on the left
          if (ahead > 0 && ahead < 5 && ahead < dist && Math.abs(side) < o.r + 1.6) {
            steer += (side >= 0 ? -1 : 1) * (1 - ahead / 5) * 2;
          }
        }
        steer = THREE.MathUtils.clamp(steer, -1, 1);
        throttle = Math.abs(d) > 1.6 ? 0.3 : Math.min(1, dist / 4);
      }
    }
  }

  // --- Simple arcade physics
  const maxSpeed = 13;
  state.speed += throttle * 22 * dt;
  state.speed *= Math.pow(0.12, dt); // drag
  state.speed = THREE.MathUtils.clamp(state.speed, -maxSpeed * 0.5, maxSpeed);
  const turnFactor = THREE.MathUtils.clamp(Math.abs(state.speed) / 4, 0, 1) * Math.sign(state.speed || 1);
  state.heading += steer * 2.4 * dt * (state.target ? 1 : turnFactor);

  const fwd = tmp.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  rover.position.addScaledVector(fwd, state.speed * dt);

  // Collisions: push out of trees/rocks/monument, stay on the island
  for (const o of obstacles) {
    if (o.station) continue;
    const dx = rover.position.x - o.x, dz = rover.position.z - o.z;
    const d = Math.hypot(dx, dz), min = o.r + 1.1;
    if (d < min && d > 0) {
      rover.position.x = o.x + (dx / d) * min;
      rover.position.z = o.z + (dz / d) * min;
      state.speed *= 0.6;
    }
  }
  const r = Math.hypot(rover.position.x, rover.position.z);
  if (r > ISLAND_RADIUS - 1.5) {
    rover.position.multiplyScalar((ISLAND_RADIUS - 1.5) / r);
    rover.position.y = 0;
    state.speed *= 0.5;
  }

  rover.rotation.y = state.heading;
  // A little body roll and bounce for character
  body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -steer * Math.min(1, Math.abs(state.speed) / maxSpeed) * 0.12, 0.1);
  body.position.y = 0.85 + Math.abs(Math.sin(t * 18)) * 0.03 * Math.min(1, Math.abs(state.speed));
  for (const w of wheels) w.rotation.x += (state.speed * dt) / 0.45;
  tip.material.emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.5;

  // Dust trail
  dustTimer += dt;
  if (Math.abs(state.speed) > 3 && dustTimer > 0.05) {
    dustTimer = 0;
    const p = dust[dustIdx++ % dust.length];
    p.life = 1;
    p.m.position.copy(rover.position).addScaledVector(fwd, -1.4);
    p.m.position.x += (Math.random() - 0.5) * 1.2;
    p.m.position.y = 0.2;
  }
  for (const p of dust) {
    if (p.life <= 0) continue;
    p.life -= dt * 1.5;
    p.m.position.y += dt * 0.8;
    p.m.scale.setScalar(1 + (1 - p.life) * 2);
    p.m.material.opacity = Math.max(0, p.life) * 0.6;
  }

  // --- Stations
  for (const s of stations) {
    s.icon.rotation.y += dt * 0.8;
    s.icon.rotation.x = Math.sin(t + s.pos.x) * 0.3;
    s.icon.position.y = 3 + Math.sin(t * 1.5 + s.pos.z) * 0.3;
    s.ring.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.3;
    s.beam.material.opacity = s.visited ? 0.05 : 0.1 + Math.sin(t * 2) * 0.05;

    const d = Math.hypot(rover.position.x - s.pos.x, rover.position.z - s.pos.z);
    const inside = d < TRIGGER_DIST;
    if (inside && !s.inside) openPanel(s);
    if (!inside && s.inside && openStation === s) closePanel();
    s.inside = inside;
  }

  // --- Gems
  for (const g of gems) {
    if (g.collected) {
      if (g.t < 1) {
        g.t += dt * 2.5;
        g.mesh.position.y += dt * 6;
        g.mesh.scale.setScalar(Math.max(0.001, 1 - g.t));
        if (g.t >= 1) g.mesh.visible = false;
      }
      continue;
    }
    g.mesh.rotation.y += dt * 2;
    g.mesh.position.y = 1 + Math.sin(t * 2 + g.phase) * 0.25;
    if (rover.position.distanceTo(tmp.set(g.mesh.position.x, 0, g.mesh.position.z)) < 1.8) {
      g.collected = true;
      toast(`+ ${g.name}`);
      updateProgress();
      if (openStation?.data.type === 'skills') panelBody.innerHTML = renderSection(openStation.data);
    }
  }

  // --- Ambient
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 80) c.position.x = -80;
  }
  marker.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
  title.position.y = 7 + Math.sin(t) * 0.3;
  // The big name is for the intro fly-over; fade it once driving so it never blocks the camera
  if (started && title.visible) {
    title.material.opacity -= dt * 2;
    if (title.material.opacity <= 0) title.visible = false;
  }

  // --- Camera
  if (started) {
    const back = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading)).multiplyScalar(-11);
    camTarget.copy(rover.position).add(back).setY(8.5);
    camera.position.lerp(camTarget, 1 - Math.pow(0.02, dt));
    camera.lookAt(rover.position.x, 1.5, rover.position.z);
  } else {
    // Slow orbit behind the intro screen
    camera.position.set(Math.sin(t * 0.1) * 55, 32, Math.cos(t * 0.1) * 55);
    camera.lookAt(0, 0, 0);
  }
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt, clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Test hook for automated checks
window.__island = { rover, stations, gems, state };
