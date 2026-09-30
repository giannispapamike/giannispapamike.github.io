import * as THREE from 'three';
import { cv, formatRange } from '../assets/data/cv.js';

// ---------- Layout constants ----------
const R = 40;            // island radius
const PATH_R = 22;       // ring path through the stations
const TRIGGER_DIST = 4.2;
const WATER_Y = -0.35;
const PIER = { x0: R - 3, x1: R + 10, halfW: 1.6, y: 0.35 };
const GRAVITY = 30;
const JUMP_V = 11;

// Stations are built from the shared CV data; this only sets how each one looks.
const STATIONS = [
  { id: 'about', label: 'About', shape: 'torus', color: '#ff7a59' },
  { id: 'experience', label: 'Experience', shape: 'box', color: '#ffc94a' },
  { id: 'projects', label: 'Projects', shape: 'knot', color: '#c58bff' },
  { id: 'skills', label: 'Skills', shape: 'octa', color: '#5aa9ff' },
  { id: 'education', label: 'Education', shape: 'cone', color: '#5ad1a7' },
  { id: 'contact', label: 'Contact', shape: 'ico', color: '#ff6fae' },
];

const cvFile = '../' + cv.cvFile;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
$('hud-name').textContent = cv.name;
$('intro-name').textContent = cv.name;
$('intro-role').textContent = cv.title;
$('hud-cv').href = cvFile;

// ---------- Helpers ----------
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
const polar = (angle, r) => ({ x: Math.cos(angle) * r, z: Math.sin(angle) * r });

const stationPositions = STATIONS.map((_, i) => polar((i / STATIONS.length) * Math.PI * 2 - Math.PI / 2, PATH_R));
const BOWLING = polar((2 / 3) * Math.PI, 31);
const DOCKYARD = { x: R - 6, z: 0 };

// Areas kept flat so stations, the monument, the bowling lane and the dock sit level
const flatZones = [
  { x: 0, z: 0, r: 9 },
  { ...BOWLING, r: 7 },
  { ...DOCKYARD, r: 7 },
  ...stationPositions.map((p) => ({ ...p, r: 6 })),
];

// ---------- Terrain ----------
function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  let hills = (Math.sin(x * 0.13) * Math.cos(z * 0.11) + 0.6 * Math.sin(x * 0.07 + z * 0.09 + 1.3) + 0.3 * Math.sin(x * 0.31 - z * 0.27)) * 0.9 + 0.35;
  hills = Math.max(0, hills) * 1.5;
  let mask = smoothstep(2.2, 5, Math.abs(r - PATH_R));
  for (const f of flatZones) mask *= smoothstep(f.r * 0.6, f.r, Math.hypot(x - f.x, z - f.z));
  mask *= 1 - smoothstep(R - 10, R - 5, r);
  const beach = r < R - 4 ? 0 : r < R ? -0.5 * (r - (R - 4)) / 4 : -0.5 - 2.2 * Math.min(1, (r - R) / 4);
  return hills * mask + beach;
}

const onPier = (x, z) => x > PIER.x0 && x < PIER.x1 && Math.abs(z) < PIER.halfW;
const onLand = (x, z) => Math.hypot(x, z) < R - 1.5;

// Height of whatever you would stand on: land, pier deck, or the sea floor
function surfaceHeight(x, z) {
  if (onPier(x, z)) return PIER.y;
  if (onLand(x, z)) return groundHeight(x, z);
  return -6;
}

// ---------- Renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const DAY = { sky: new THREE.Color('#8fd0f7'), fog: new THREE.Color('#bfe3f7'), water: new THREE.Color('#3fa9e0'), hemiSky: new THREE.Color('#ffffff'), sun: new THREE.Color('#fff2dd') };
const NIGHT = { sky: new THREE.Color('#0b1430'), fog: new THREE.Color('#101c3d'), water: new THREE.Color('#10305a'), hemiSky: new THREE.Color('#6d80c9'), sun: new THREE.Color('#9db4ff') };
scene.background = DAY.sky.clone();
scene.fog = new THREE.Fog(DAY.fog.clone(), 70, 170);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 40, 60);

const hemi = new THREE.HemisphereLight('#ffffff', '#6a8f5a', 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2dd', 2.2);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -52, right: 52, top: 52, bottom: -52, near: 1, far: 160 });
scene.add(sun);

// ---------- Water ----------
const waterGeo = new THREE.PlaneGeometry(420, 420, 90, 90);
waterGeo.rotateX(-Math.PI / 2);
const waterBase = waterGeo.attributes.position.array.slice();
const waterMat = new THREE.MeshStandardMaterial({ color: DAY.water.clone(), flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = WATER_Y;
water.receiveShadow = true;
scene.add(water);

const foam = new THREE.Mesh(
  new THREE.RingGeometry(R - 1.6, R - 0.6, 96),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }),
);
foam.rotation.x = -Math.PI / 2;
foam.position.y = WATER_Y + 0.08;
scene.add(foam);

// ---------- Island ground ----------
{
  const size = (R + 6) * 2;
  const geo = new THREE.PlaneGeometry(size, size, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const grassA = new THREE.Color('#79c267'), grassB = new THREE.Color('#5aa653'), hillTop = new THREE.Color('#8fb86a');
  const sand = new THREE.Color('#f1d9a0'), wetSand = new THREE.Color('#d9bd82'), path = new THREE.Color('#e3cf9d');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    const r = Math.hypot(x, z);
    if (r > R - 1.5) c.copy(wetSand);
    else if (r > R - 5.5) c.copy(sand).lerp(grassA, smoothstep(R - 4.5, R - 6, r));
    else if (Math.abs(r - PATH_R) < 1.4) c.copy(path);
    else c.copy(grassA).lerp(grassB, (Math.sin(x * 0.5) * Math.cos(z * 0.4) + 1) / 2).lerp(hillTop, smoothstep(1, 2.4, h));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
  ground.receiveShadow = true;
  scene.add(ground);
}

// ---------- Placement ----------
const obstacles = []; // static colliders { x, z, r, h }
const reserved = [...flatZones, { ...BOWLING, r: 8 }];

function isClear(x, z, margin = 1.5) {
  const r = Math.hypot(x, z);
  if (Math.abs(r - PATH_R) < 3) return false;
  if (reserved.some((f) => Math.hypot(f.x - x, f.z - z) < f.r)) return false;
  return obstacles.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + margin);
}

function randomSpot(minR, maxR, margin) {
  for (let tries = 0; tries < 300; tries++) {
    const a = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    const p = polar(a, r);
    if (isClear(p.x, p.z, margin)) return p;
  }
  return null;
}

const shadowAll = (g) => g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

// ---------- Vegetation ----------
function pine(x, z) {
  const g = new THREE.Group();
  const h = 1.5 + rand() * 1.5;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, h, 6), flat('#8a5a3b'));
  trunk.position.y = h / 2;
  g.add(trunk);
  const leaf = flat(['#3f9b4f', '#4caf50', '#2f8f46'][Math.floor(rand() * 3)]);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.35, 1.6, 7), leaf);
    cone.position.y = h + i * 0.8;
    g.add(cone);
  }
  place(g, x, z, 1, h + 2.4);
}

function roundTree(x, z) {
  const g = new THREE.Group();
  const h = 1.4 + rand();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 6), flat('#7a4f33'));
  trunk.position.y = h / 2;
  g.add(trunk);
  const leaf = flat(['#6cbf4a', '#8bcf5a', '#e58fb0'][Math.floor(rand() * 3)]);
  for (let i = 0; i < 3; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rand() * 0.4, 0), leaf);
    blob.position.set((rand() - 0.5) * 1, h + 0.5 + rand() * 0.6, (rand() - 0.5) * 1);
    g.add(blob);
  }
  place(g, x, z, 1, h + 2);
}

function palm(x, z) {
  const g = new THREE.Group();
  const lean = new THREE.Vector3(-x, 0, -z).normalize().multiplyScalar(-0.25); // lean out to sea
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 6), flat(i % 2 ? '#a07650' : '#8a6340'));
    seg.position.set(lean.x * i * i * 0.12, y + 0.3, lean.z * i * i * 0.12);
    g.add(seg);
    y += 0.55;
  }
  const top = new THREE.Vector3(lean.x * 36 * 0.12, y, lean.z * 36 * 0.12);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), flat('#3ea357'));
    leaf.position.copy(top);
    leaf.rotation.set(Math.PI / 2 + 0.5, (i / 6) * Math.PI * 2, 0, 'YXZ');
    leaf.translateY(1);
    g.add(leaf);
  }
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), flat('#6b4a2b'));
  nut.position.copy(top).add(new THREE.Vector3(0.2, -0.15, 0));
  g.add(nut);
  place(g, x, z, 0.6, y + 1);
}

function rock(x, z) {
  const s = 0.5 + rand() * 0.9;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), flat(['#9aa3ad', '#8a929c', '#a9b0b8'][Math.floor(rand() * 3)]));
  m.position.y = s * 0.45;
  m.rotation.set(rand(), rand(), rand());
  const g = new THREE.Group();
  g.add(m);
  place(g, x, z, s * 0.9, s * 0.9);
}

function bush(x, z) {
  const g = new THREE.Group();
  const mat = flat(['#4f9e45', '#5fae4f'][Math.floor(rand() * 2)]);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rand() * 0.25, 0), mat);
    b.position.set((rand() - 0.5) * 0.8, 0.35, (rand() - 0.5) * 0.8);
    g.add(b);
  }
  place(g, x, z, 0.7, 0.8);
}

function place(g, x, z, r, h) {
  g.position.set(x, groundHeight(x, z) - 0.05, z);
  g.rotation.y = rand() * Math.PI * 2;
  shadowAll(g);
  scene.add(g);
  obstacles.push({ x, z, r, h: g.position.y + h });
}

// ---------- Landmarks ----------
// Monument in the middle
{
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.6, 8), flat('#e9e2d4'));
  base.position.y = 0.3;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 2.6, 8), flat('#f4efe6'));
  column.position.y = 1.9;
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), new THREE.MeshStandardMaterial({ color: '#ffd36e', emissive: '#ffb347', emissiveIntensity: 0.4, flatShading: true }));
  orb.position.y = 3.9;
  g.add(base, column, orb);
  shadowAll(g);
  scene.add(g);
  obstacles.push({ x: 0, z: 0, r: 2.6, h: 4.5 });
  var monumentOrb = orb;
}

// Lighthouse on the western shore
const lighthouse = (() => {
  const p = polar(Math.PI, R - 4);
  const g = new THREE.Group();
  const y0 = groundHeight(p.x, p.z);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.3 - i * 0.14, 1.4 - i * 0.14, 1.4, 12), flat(i % 2 ? '#e64b3c' : '#ffffff'));
    seg.position.y = 0.7 + i * 1.4;
    g.add(seg);
  }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.25, 12), flat('#2b2f38'));
  deck.position.y = 7.1;
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4c2', emissive: '#ffe28a', emissiveIntensity: 0.3 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 10), lampMat);
  lamp.position.y = 7.7;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.9, 10), flat('#e64b3c'));
  roof.position.y = 8.65;
  g.add(deck, lamp, roof);
  shadowAll(g);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  beam.geometry.translate(0, -13, 0);
  beam.rotation.z = Math.PI / 2;
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 7.7;
  beamPivot.add(beam);
  g.add(beamPivot);
  const light = new THREE.PointLight('#ffe28a', 0, 30, 1.5);
  light.position.y = 7.7;
  g.add(light);
  g.position.set(p.x, y0, p.z);
  scene.add(g);
  obstacles.push({ x: p.x, z: p.z, r: 1.6, h: y0 + 9 });
  reserved.push({ x: p.x, z: p.z, r: 4 });
  return { lampMat, beam, beamPivot, light };
})();

// Pier on the eastern shore — you can drive onto it, and off the end
{
  const g = new THREE.Group();
  const len = PIER.x1 - PIER.x0;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, PIER.halfW * 2), flat('#b98a5a'));
  deck.position.set(PIER.x0 + len / 2, PIER.y - 0.12, 0);
  g.add(deck);
  for (let x = PIER.x0 + 0.5; x < PIER.x1; x += 0.9) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, PIER.halfW * 2), flat('#8f6841'));
    plank.position.set(x, PIER.y + 0.01, 0);
    g.add(plank);
  }
  for (let x = PIER.x0 + 1; x <= PIER.x1; x += 3) {
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 6), flat('#6e4f31'));
      post.position.set(x, PIER.y - 1.1, s * (PIER.halfW - 0.1));
      g.add(post);
    }
  }
  shadowAll(g);
  scene.add(g);

  // Moored boat
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 1.4), flat('#2f6fb0'));
  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 1.5), flat('#ffffff'));
  trim.position.y = 0.4;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6), flat('#dddddd'));
  mast.position.y = 1.6;
  const sail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 3), flat('#fff7e8'));
  sail.position.set(0.4, 1.6, 0);
  sail.scale.z = 0.1;
  boat.add(hull, trim, mast, sail);
  shadowAll(boat);
  boat.position.set(R + 5, WATER_Y + 0.2, 3);
  scene.add(boat);
  var mooredBoat = boat;
}

// Cargo ship sailing around the island (FleetView would be keeping an eye on it)
const cargoShip = (() => {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 4), flat('#26344d'));
  hull.position.y = 0.4;
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2, 3, 4), flat('#26344d'));
  bow.rotation.set(0, Math.PI / 4, -Math.PI / 2);
  bow.scale.set(1, 1, 0.72);
  bow.position.set(9.4, 0.4, 0);
  const deckStripe = new THREE.Mesh(new THREE.BoxGeometry(16.1, 0.3, 4.1), flat('#c0392b'));
  deckStripe.position.y = -0.5;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 3.6), flat('#f2f2f2'));
  bridge.position.set(-6.2, 2.7, 0);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.6), flat('#333'));
  radar.position.set(-6.2, 4.3, 0);
  g.add(hull, bow, deckStripe, bridge, radar);
  const boxColors = ['#e67e22', '#2e86de', '#27ae60', '#c0392b', '#f1c40f', '#8e44ad'];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      for (let k = 0; k < 1 + ((i + j) % 2); k++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(2, 1.1, 1.6), flat(boxColors[(i * 3 + j + k) % boxColors.length]));
        box.position.set(-3.4 + i * 2.3, 1.95 + k * 1.1, j ? 0.85 : -0.85);
        g.add(box);
      }
    }
  }
  const windowMat = new THREE.MeshStandardMaterial({ color: '#223', emissive: '#ffd27a', emissiveIntensity: 0 });
  const windows = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.4, 3.2), windowMat);
  windows.position.set(-6.2, 3.3, 0);
  g.add(windows);
  shadowAll(g);
  scene.add(g);
  return { group: g, radar, windowMat };
})();

// Lamp posts along the ring path
const lamps = [];
for (let i = 0; i < 12; i++) {
  const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
  const p = polar(a, PATH_R + 2.2);
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.6, 6), flat('#39404d'));
  pole.position.y = 1.3;
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#ffd27a', emissiveIntensity: 0.1 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bulbMat);
  bulb.position.y = 2.7;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 8), flat('#39404d'));
  cap.position.y = 2.95;
  g.add(pole, bulb, cap);
  shadowAll(g);
  bulb.castShadow = false;
  g.position.set(p.x, groundHeight(p.x, p.z), p.z);
  scene.add(g);
  obstacles.push({ x: p.x, z: p.z, r: 0.3, h: g.position.y + 3 });
  let light = null;
  if (i % 2 === 0) { // every other lamp casts real light to keep the scene fast
    light = new THREE.PointLight('#ffcf85', 0, 11, 1.6);
    light.position.set(p.x, g.position.y + 2.6, p.z);
    scene.add(light);
  }
  lamps.push({ bulbMat, light });
}

// Scatter trees, rocks, bushes, palms
for (let i = 0; i < 40; i++) { const p = randomSpot(8, R - 7, 2); if (p) (rand() < 0.55 ? pine : roundTree)(p.x, p.z); }
for (let i = 0; i < 16; i++) { const p = randomSpot(8, R - 6, 1.5); if (p) rock(p.x, p.z); }
for (let i = 0; i < 22; i++) { const p = randomSpot(8, R - 6, 1); if (p) bush(p.x, p.z); }
for (let i = 0; i < 12; i++) { const p = randomSpot(R - 4.5, R - 3, 2.5); if (p) palm(p.x, p.z); }

// Grass tufts and flowers (instanced so hundreds cost one draw call each)
{
  const tuft = new THREE.ConeGeometry(0.08, 0.45, 3);
  tuft.translate(0, 0.2, 0);
  const grass = new THREE.InstancedMesh(tuft, flat('#4f9e45'), 900);
  const bloom = new THREE.IcosahedronGeometry(0.12, 0);
  bloom.translate(0, 0.25, 0);
  const flowers = new THREE.InstancedMesh(bloom, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6 }), 260);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const petal = ['#ffffff', '#ffd93d', '#ff7aa8', '#b18cff', '#ff8a5b'].map((c) => new THREE.Color(c));
  let gi = 0, fi = 0;
  for (let tries = 0; tries < 6000 && (gi < 900 || fi < 260); tries++) {
    const p = polar(rand() * Math.PI * 2, 3 + rand() * (R - 9));
    if (Math.abs(Math.hypot(p.x, p.z) - PATH_R) < 1.8 || obstacles.some((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r)) continue;
    if (reserved.some((f) => Math.hypot(f.x - p.x, f.z - p.z) < f.r * 0.7)) continue;
    v.set(p.x, groundHeight(p.x, p.z), p.z);
    q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.4, rand() * 6, (rand() - 0.5) * 0.4));
    if (gi < 900 && (fi >= 260 || rand() < 0.78)) {
      s.setScalar(0.7 + rand() * 0.8);
      grass.setMatrixAt(gi++, m.compose(v, q, s));
    } else {
      s.setScalar(0.8 + rand() * 0.6);
      flowers.setMatrixAt(fi, m.compose(v, q, s));
      flowers.setColorAt(fi++, petal[Math.floor(rand() * petal.length)]);
    }
  }
  grass.count = gi;
  flowers.count = fi;
  grass.receiveShadow = flowers.receiveShadow = true;
  scene.add(grass, flowers);
}

// Clouds
const clouds = [];
for (let i = 0; i < 9; i++) {
  const c = new THREE.Group();
  const mat = flat('#ffffff', { roughness: 1, transparent: true, opacity: 0.95 });
  for (let j = 0; j < 4; j++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + rand() * 1.5, 0), mat);
    puff.position.set(j * 2.2 - 3, rand(), rand() * 1.5);
    c.add(puff);
  }
  c.position.set((rand() - 0.5) * 160, 20 + rand() * 8, (rand() - 0.5) * 160);
  c.userData.speed = 1 + rand() * 1.5;
  c.userData.mat = mat;
  scene.add(c);
  clouds.push(c);
}

// Night sky: stars and moon
const stars = (() => {
  const n = 700, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = rand() * Math.PI * 2, ph = Math.acos(rand() * 0.9 + 0.1);
    arr.set([Math.sin(ph) * Math.cos(th) * 220, Math.cos(ph) * 220, Math.sin(ph) * Math.sin(th) * 220], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(pts);
  return pts;
})();

const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 16), new THREE.MeshBasicMaterial({ color: '#f4f1de', transparent: true, opacity: 0, fog: false }));
moon.position.set(-90, 80, -120);
scene.add(moon);

// Fireflies drifting between the trees at night
const fireflies = (() => {
  const n = 90, arr = new Float32Array(n * 3), base = [];
  for (let i = 0; i < n; i++) {
    const p = polar(rand() * Math.PI * 2, 6 + rand() * (R - 12));
    base.push({ x: p.x, z: p.z, y: groundHeight(p.x, p.z) + 0.6 + rand() * 1.8, ph: rand() * 10 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fff27a', size: 0.25, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts);
  return { pts, base, arr };
})();

// ---------- Labels ----------
function makeLabel(text, color, scale = 1) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '800 64px Poppins, system-ui, sans-serif';
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
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
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

const stations = STATIONS.map((data, i) => {
  const p = stationPositions[i];
  const pos = new THREE.Vector3(p.x, 0, p.z);
  const color = new THREE.Color(data.color);
  const g = new THREE.Group();
  g.position.copy(pos);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.4, 24), flat('#ffffff'));
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  g.add(pad);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.12, 8, 48), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }));
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
  return { data, group: g, icon, ring, beam, pos, visited: false, inside: false };
});

const title = makeLabel(cv.name.toUpperCase(), '#1d2433', 2.2);
title.position.set(0, 8, 0);
scene.add(title);

// ---------- Skill gems ----------
const skillNames = cv.skills.flatMap((g) => g.items);
const gemGeo = new THREE.OctahedronGeometry(0.45);
const gems = skillNames.map((name, i) => {
  const p = randomSpot(5, R - 5, 0.8) || polar(rand() * 6.28, 12);
  const high = i % 4 === 3; // some gems float high: jump to reach them
  const color = new THREE.Color().setHSL(i / skillNames.length, 0.8, 0.6);
  const mesh = new THREE.Mesh(gemGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, flatShading: true }));
  const baseY = groundHeight(p.x, p.z) + (high ? 3.1 : 1);
  mesh.position.set(p.x, baseY, p.z);
  mesh.castShadow = true;
  scene.add(mesh);
  if (high) { // a faint pillar hints that this one needs a jump
    const hint = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    hint.position.set(p.x, baseY - 1.6, p.z);
    scene.add(hint);
    mesh.userData.hint = hint;
  }
  return { name, mesh, baseY, collected: false, t: 0, phase: rand() * 6 };
});

// ---------- Pushable props ----------
const props = [];

function stripedBall() {
  const geo = new THREE.SphereGeometry(0.6, 16, 12);
  const colors = [];
  const pal = ['#ff4d4d', '#ffffff', '#ffd93d', '#ffffff', '#3fa9f5', '#ffffff'].map((c) => new THREE.Color(c));
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const c = pal[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 6) % 6];
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
}

function crateMesh(size, color, trimColor) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), flat(color)));
  const t = flat(trimColor);
  for (const [sx, sz] of [[1, 0], [0, 1]]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(sx ? size * 1.02 : 0.12, size * 1.02, sz ? size * 1.02 : 0.12), t);
    g.add(band);
  }
  return g;
}

function barrelMesh() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12), flat(rand() < 0.5 ? '#c0392b' : '#2e86de')));
  for (const y of [-0.35, 0.35]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.04, 4, 16), flat('#555'));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  return g;
}

function pinMesh() {
  const pts = [[0, 0], [0.22, 0.02], [0.3, 0.3], [0.26, 0.55], [0.13, 0.8], [0.15, 0.95], [0.12, 1.1], [0, 1.15]].map(([x, y]) => new THREE.Vector2(x, y));
  const white = new THREE.Mesh(new THREE.LatheGeometry(pts, 10), flat('#fafafa', { roughness: 0.4 }));
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.08, 10), flat('#e0322b'));
  stripe.position.y = 0.88;
  const g = new THREE.Group();
  g.add(white, stripe);
  return g;
}

const PROP_TYPES = {
  ball: { r: 0.6, halfH: 0.6, mass: 0.35, bounce: 0.8, friction: 0.5, make: stripedBall, rolls: true },
  crate: { r: 0.8, halfH: 0.55, mass: 1.4, bounce: 0.35, friction: 2.5, make: () => crateMesh(1.1, '#c8955c', '#8c6239') },
  cargo: { r: 1, halfH: 0.7, mass: 3.5, bounce: 0.2, friction: 5, make: () => crateMesh(1.4, ['#e67e22', '#2e86de', '#27ae60'][Math.floor(rand() * 3)], '#2b2f38') },
  barrel: { r: 0.55, halfH: 0.55, mass: 1, bounce: 0.45, friction: 1.6, make: barrelMesh },
  pin: { r: 0.3, halfH: 0, mass: 0.25, bounce: 0.5, friction: 3, make: pinMesh, tips: true },
};

function addProp(type, x, z) {
  const def = PROP_TYPES[type];
  const group = new THREE.Group();
  const inner = def.make();
  inner.position.y = def.halfH;
  const pivot = new THREE.Group(); // pins tip over around their base
  pivot.add(inner);
  group.add(pivot);
  shadowAll(group);
  scene.add(group);
  const p = { type, def, group, pivot, inner, home: { x, z }, x, z, vx: 0, vz: 0, air: 0, vy: 0, spin: 0, tipped: 0, tipAxis: new THREE.Vector3(1, 0, 0), sinking: -1 };
  resetProp(p);
  props.push(p);
  return p;
}

function resetProp(p) {
  Object.assign(p, { x: p.home.x, z: p.home.z, vx: 0, vz: 0, air: 0, vy: 0, spin: 0, tipped: 0, sinking: -1 });
  p.group.visible = true;
  p.group.rotation.set(0, rand() * Math.PI * 2, 0);
  p.pivot.quaternion.identity();
  p.inner.quaternion.identity();
  p.inner.position.y = p.def.halfH;
}

// Beach balls on the sand
for (let i = 0; i < 6; i++) { const q = polar(rand() * Math.PI * 2, R - 4); if (isClear(q.x, q.z, 1)) addProp('ball', q.x, q.z); }
// Crates and barrels around the island
for (let i = 0; i < 7; i++) { const q = randomSpot(8, R - 7, 1.5); if (q) addProp('crate', q.x, q.z); }
for (let i = 0; i < 5; i++) { const q = randomSpot(8, R - 7, 1.5); if (q) addProp('barrel', q.x, q.z); }
// Cargo boxes at the dock
for (const [dx, dz] of [[-1, -3.5], [0.6, -3.4], [-0.2, 3.6], [1.6, 3.2]]) addProp('cargo', DOCKYARD.x + dx, DOCKYARD.z + dz);

// Bowling lane: ten pins in a triangle, head pin facing the island centre
const pins = [];
{
  const toCentre = new THREE.Vector2(-BOWLING.x, -BOWLING.z).normalize();
  const side = new THREE.Vector2(-toCentre.y, toCentre.x);
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k <= row; k++) {
      const off = (k - row / 2) * 0.9;
      const back = row * 0.8 - 1.2;
      pins.push(addProp('pin', BOWLING.x - toCentre.x * back + side.x * off, BOWLING.z - toCentre.y * back + side.y * off));
    }
  }
  // Lane markings
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 11), new THREE.MeshStandardMaterial({ color: '#e8c996', roughness: 0.6 }));
  lane.rotation.x = -Math.PI / 2;
  lane.rotation.z = Math.atan2(toCentre.x, toCentre.y);
  lane.position.set(BOWLING.x + toCentre.x * 2.5, 0.03, BOWLING.z + toCentre.y * 2.5);
  lane.receiveShadow = true;
  scene.add(lane);
  const lbl = makeLabel('Bowling', '#e0322b', 0.8);
  lbl.position.set(BOWLING.x - toCentre.x * 3.5, 3, BOWLING.z - toCentre.y * 3.5);
  scene.add(lbl);
}
let strikeTimer = -1;

// ---------- Rover ----------
const rover = new THREE.Group();
const chassis = new THREE.Group(); // tilts with the terrain; wheels stay attached
rover.add(chassis);
const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.6), flat('#ff7a59'));
body.position.y = 0.85;
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.2), flat('#1d2433'));
cabin.position.set(0, 1.45, -0.2);
const lampMat = new THREE.MeshStandardMaterial({ color: '#fff7c2', emissive: '#fff7c2', emissiveIntensity: 1 });
const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.1), lampMat);
lamp.position.set(0, 0.95, 1.31);
const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2), flat('#1d2433'));
antenna.position.set(-0.6, 2, -0.9);
const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: '#ffc94a', emissive: '#ffc94a' }));
tip.position.set(-0.6, 2.6, -0.9);
chassis.add(body, cabin, lamp, antenna, tip);

const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12);
for (const [x, z] of [[-1, 0.85], [1, 0.85], [-1, -0.85], [1, -0.85]]) {
  const w = new THREE.Mesh(wheelGeo, flat('#2b2f38'));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.45, z);
  chassis.add(w);
  wheels.push(w);
}
shadowAll(rover);

const headlight = new THREE.SpotLight('#fff3c4', 0, 32, 0.55, 0.5, 1.2);
headlight.position.set(0, 1, 1.3);
headlight.target.position.set(0, 0, 10);
chassis.add(headlight, headlight.target);

rover.position.set(0, 0, 8);
scene.add(rover);

const state = { heading: 0, speed: 0, target: null, vy: 0, grounded: true, pitch: 0, roll: 0, squash: 1, respawn: -1 };

// Click / tap target marker
const marker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

// Particles: dust behind the rover, splashes in the sea
const particles = [];
const partGeo = new THREE.SphereGeometry(0.18, 5, 4);
for (let i = 0; i < 60; i++) {
  const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color: '#e8dcc0', transparent: true, opacity: 0 }));
  scene.add(m);
  particles.push({ m, life: 0, vx: 0, vy: 0, vz: 0 });
}
let partIdx = 0;
function emit(x, y, z, color, vx, vy, vz) {
  const p = particles[partIdx++ % particles.length];
  p.life = 1;
  p.m.position.set(x, y, z);
  p.m.material.color.set(color);
  Object.assign(p, { vx, vy, vz });
}
function splash(x, z) {
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2, s = 2 + rand() * 3;
    emit(x, WATER_Y + 0.2, z, '#dff4ff', Math.cos(a) * s, 5 + rand() * 4, Math.sin(a) * s);
  }
}

// ---------- Input ----------
const keys = new Set();
const keyMap = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
window.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) { keys.add(keyMap[e.code]); state.target = null; marker.visible = false; e.preventDefault(); }
  if (e.code === 'Space') { jump(); e.preventDefault(); }
  if (e.code === 'KeyN' && !e.repeat) toggleNight();
  if (e.code === 'Escape') closePanel();
});
window.addEventListener('keyup', (e) => keys.delete(keyMap[e.code]));
window.addEventListener('blur', () => keys.clear());
$('jump-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });

function jump() {
  if (!started || !state.grounded || state.respawn >= 0) return;
  state.vy = JUMP_V;
  state.grounded = false;
  for (let i = 0; i < 6; i++) emit(rover.position.x + (rand() - 0.5) * 1.5, rover.position.y + 0.2, rover.position.z + (rand() - 0.5) * 1.5, '#e8dcc0', (rand() - 0.5) * 2, 1, (rand() - 0.5) * 2);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!started) return;
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = stations.find((s) => raycaster.intersectObject(s.group, true).length);
  if (hit) return driveTo(hit);
  // March along the ray to find where it meets the terrain
  const o = raycaster.ray.origin, d = raycaster.ray.direction;
  for (let t = 0; t < 200; t += 0.25) {
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (y <= surfaceHeight(x, z)) {
      if (onLand(x, z) || onPier(x, z)) setTarget(new THREE.Vector3(x, 0, z));
      return;
    }
  }
});

function setTarget(p) {
  state.target = p.clone();
  marker.position.set(p.x, surfaceHeight(p.x, p.z) + 0.06, p.z);
  marker.visible = true;
}

function driveTo(station) {
  const dir = rover.position.clone().sub(station.pos).setY(0).normalize();
  setTarget(station.pos.clone().add(dir.multiplyScalar(1.5)));
}

const nav = $('stations');
stations.forEach((s) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="dot" style="background:${s.data.color}"></span>${esc(s.data.label)}`;
  b.addEventListener('click', () => { driveTo(s); openPanel(s); });
  s.button = b;
  nav.appendChild(b);
});

// ---------- Panel ----------
const panel = $('panel');
const panelBody = $('panel-body');
let openStation = null;

function renderSection(d) {
  const h = `<h2>${esc(d.label)}</h2>`;
  switch (d.id) {
    case 'about':
      return h + `<p class="lead">${esc(cv.tagline)}</p>` + cv.about.map((p) => `<p>${esc(p)}</p>`).join('');
    case 'experience':
      return h + cv.experience.map((j) => `
        <div class="tl-item">
          <div class="date">${esc(formatRange(j.start, j.end))}${j.end ? '' : ' · Now'}</div>
          <h3>${esc(j.role)}</h3>
          <h4>${esc(j.company)} · ${esc(j.location)}</h4>
          <p>${esc(j.summary)}</p>
          ${!j.end && j.highlights ? `<ul>${j.highlights.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>`).join('');
    case 'projects':
      return h + cv.work.map((w) => `
        <div class="proj"><span class="org">${esc(w.org)}</span><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></div>`).join('');
    case 'skills': {
      const got = new Set(gems.filter((g) => g.collected).map((g) => g.name));
      return h + `<p>Collect the gems around the island to light up each skill (${got.size}/${gems.length}). Some float high: jump for them.</p>` +
        cv.skills.map((g) => `
          <div class="group"><h3>${esc(g.group)}</h3>
          <div class="tags">${g.items.map((x) => `<span class="tag ${got.has(x) ? 'got' : ''}">${esc(x)}</span>`).join('')}</div></div>`).join('');
    }
    case 'education':
      return h + cv.education.map((e) => `
        <div class="tl-item">
          <div class="date">${esc(formatRange(e.start, e.end))}</div>
          <h3>${esc(e.degree)}</h3>
          <h4>${esc(e.school)}</h4>
          <ul>${e.details.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>`).join('') +
        `<div class="group"><h3>Languages</h3>${cv.languages.map((l) => `<p><strong>${esc(l.name)}</strong> · ${esc(l.level)}</p>`).join('')}</div>`;
    case 'contact':
      return h + `<p>Email: <strong class="select">${esc(cv.email)}</strong></p>
        <div class="contact">
          <a href="mailto:${esc(cv.email)}">Send an email →</a>
          <a href="${esc(cv.linkedin)}" target="_blank" rel="noopener">LinkedIn →</a>
          <a href="${esc(cv.github)}" target="_blank" rel="noopener">GitHub →</a>
          <a href="${esc(cvFile)}" download>Download CV (PDF) →</a>
        </div>`;
    default:
      return h;
  }
}

function openPanel(s) {
  openStation = s;
  panel.style.setProperty('--c', s.data.color);
  panelBody.innerHTML = renderSection(s.data);
  panel.scrollTop = 0;
  panel.classList.add('open');
  if (!s.visited) {
    s.visited = true;
    s.button.classList.add('visited');
    updateProgress();
    if (stations.every((x) => x.visited)) toast('🎉 You explored the whole island!');
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
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

// ---------- Day / night (shared with the classic site via localStorage 'gp-theme') ----------
let nightTarget = (() => {
  try {
    const t = localStorage.getItem('gp-theme');
    if (t === 'dark') return 1;
    if (t === 'light') return 0;
  } catch { /* storage unavailable */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0;
})();
let night = nightTarget;

function applyNightUi() {
  document.documentElement.toggleAttribute('data-night', nightTarget === 1);
  $('theme-btn').setAttribute('aria-label', nightTarget ? 'Switch to day' : 'Switch to night');
}
function toggleNight() {
  nightTarget = nightTarget ? 0 : 1;
  try { localStorage.setItem('gp-theme', nightTarget ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  applyNightUi();
}
$('theme-btn').addEventListener('click', toggleNight);
applyNightUi();

const tmpColor = new THREE.Color();
function applyNight(n) {
  scene.background.copy(DAY.sky).lerp(NIGHT.sky, n);
  scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, n);
  waterMat.color.copy(DAY.water).lerp(NIGHT.water, n);
  hemi.intensity = 1.15 - n * 0.8;
  hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
  sun.intensity = 2.2 - n * 1.75;
  sun.color.copy(DAY.sun).lerp(NIGHT.sun, n);
  stars.material.opacity = n;
  moon.material.opacity = n;
  fireflies.pts.material.opacity = n;
  headlight.intensity = n * 60;
  lampMat.emissiveIntensity = 1 + n * 2;
  for (const l of lamps) {
    l.bulbMat.emissiveIntensity = 0.1 + n * 2.4;
    if (l.light) l.light.intensity = n * 18;
  }
  lighthouse.lampMat.emissiveIntensity = 0.3 + n * 2.5;
  lighthouse.beam.material.opacity = n * 0.22;
  lighthouse.light.intensity = n * 30;
  cargoShip.windowMat.emissiveIntensity = n * 1.5;
  monumentOrb.material.emissiveIntensity = 0.4 + n * 1.4;
  for (const c of clouds) c.userData.mat.color.copy(tmpColor.set('#ffffff').lerp(NIGHT.hemiSky, n * 0.7));
  foam.material.opacity = 0.5 - n * 0.3;
}
applyNight(night);

// ---------- Intro ----------
let started = false;
$('start').addEventListener('click', () => {
  started = true;
  $('intro').classList.add('hidden');
});

// ---------- Physics ----------
const tmp = new THREE.Vector3();
const camTarget = new THREE.Vector3();

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function knockPin(p, dx, dz) {
  if (p.tipped > 0) return;
  p.tipped = 0.001;
  p.tipAxis.set(dz, 0, -dx).normalize();
}

function updateProps(dt, rvx, rvz) {
  const RMASS = 4;
  for (const p of props) {
    const def = p.def;
    if (p.sinking >= 0) {
      p.sinking += dt;
      p.group.position.y -= dt * 1.2;
      if (p.sinking > 3) resetProp(p);
      continue;
    }

    // Rover ↔ prop
    const dx = p.x - rover.position.x, dz = p.z - rover.position.z;
    const dist = Math.hypot(dx, dz), min = def.r + 1.15;
    const propTop = surfaceHeight(p.x, p.z) + p.air + def.halfH * 2 + (def.tips ? 1.1 : 0);
    if (dist < min && dist > 1e-4 && rover.position.y < propTop - 0.2) {
      const nx = dx / dist, nz = dz / dist;
      const rel = (rvx - p.vx) * nx + (rvz - p.vz) * nz;
      if (rel > 0) {
        const j = 1.25 * (1 + def.bounce) * rel / (1 / RMASS + 1 / def.mass); // a bit extra kick for fun
        p.vx += (j / def.mass) * nx;
        p.vz += (j / def.mass) * nz;
        const lift = def.mass < 0.5 ? Math.min(9, rel * 0.75) : Math.min(4, rel * 0.15); // light things fly
        if (lift > 1.5) { p.vy = Math.max(p.vy, lift); }
        p.spin += (rand() - 0.5) * j * 1.5 / def.mass;
        // Slow the rover by how much it gave away
        const fwdDot = Math.sin(state.heading) * nx + Math.cos(state.heading) * nz;
        state.speed -= (j / RMASS) * fwdDot;
        if (def.tips && rel > 1.5) knockPin(p, nx, nz);
        if (j > 6 && !def.tips) bumpToast(p.type);
      }
      const push = min - dist;
      p.x += nx * push * 0.85;
      p.z += nz * push * 0.85;
      rover.position.x -= nx * push * 0.15;
      rover.position.z -= nz * push * 0.15;
    }
  }

  // Prop ↔ prop
  for (let i = 0; i < props.length; i++) {
    const a = props[i];
    if (a.sinking >= 0) continue;
    for (let k = i + 1; k < props.length; k++) {
      const b = props[k];
      if (b.sinking >= 0) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz), min = a.def.r + b.def.r;
      if (d >= min || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d;
      const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rel > 0) {
        const e = Math.min(a.def.bounce, b.def.bounce);
        const j = (1 + e) * rel / (1 / a.def.mass + 1 / b.def.mass);
        a.vx -= (j / a.def.mass) * nx; a.vz -= (j / a.def.mass) * nz;
        b.vx += (j / b.def.mass) * nx; b.vz += (j / b.def.mass) * nz;
        if (a.def.tips && rel > 1) knockPin(a, -nx, -nz);
        if (b.def.tips && rel > 1) knockPin(b, nx, nz);
      }
      const push = (min - d) / 2;
      a.x -= nx * push; a.z -= nz * push;
      b.x += nx * push; b.z += nz * push;
    }
  }

  // Integrate
  for (const p of props) {
    if (p.sinking >= 0) continue;
    const def = p.def;
    p.x += p.vx * dt;
    p.z += p.vz * dt;

    // Static obstacles
    for (const o of obstacles) {
      const dx = p.x - o.x, dz = p.z - o.z;
      const d = Math.hypot(dx, dz), min = o.r + def.r;
      if (d < min && d > 1e-4) {
        const nx = dx / d, nz = dz / d;
        p.x = o.x + nx * min; p.z = o.z + nz * min;
        const vn = p.vx * nx + p.vz * nz;
        if (vn < 0) { p.vx -= (1 + def.bounce) * vn * nx; p.vz -= (1 + def.bounce) * vn * nz; }
        if (def.tips && Math.abs(vn) > 1) knockPin(p, nx, nz);
      }
    }

    // Vertical
    if (p.air > 0 || p.vy > 0) {
      p.vy -= GRAVITY * dt;
      p.air += p.vy * dt;
      if (p.air <= 0) {
        p.air = 0;
        p.vy = -p.vy * def.bounce * 0.6;
        if (p.vy < 1.2) p.vy = 0;
      }
    }

    // Friction (only while touching the ground)
    if (p.air <= 0.01) {
      const f = Math.max(0, 1 - def.friction * dt);
      p.vx *= f; p.vz *= f;
    }
    p.spin *= Math.max(0, 1 - 2 * dt);

    // Off the island edge: into the sea
    if (!onLand(p.x, p.z) && !onPier(p.x, p.z)) {
      p.sinking = 0;
      splash(p.x, p.z);
      continue;
    }

    const ground = surfaceHeight(p.x, p.z);
    p.group.position.set(p.x, ground + p.air, p.z);
    p.group.rotation.y += p.spin * dt;

    const speed = Math.hypot(p.vx, p.vz);
    if (def.rolls && speed > 0.01) {
      tmp.set(p.vz, 0, -p.vx).normalize();
      // Undo the group's yaw so the rolling axis is in world space
      tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), -p.group.rotation.y);
      p.inner.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(tmp, (speed * dt) / def.r));
    }
    if (def.tips && p.tipped > 0 && p.tipped < 1) {
      p.tipped = Math.min(1, p.tipped + dt * 3.5);
      const ax = p.tipAxis.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -p.group.rotation.y);
      p.pivot.quaternion.setFromAxisAngle(ax, p.tipped * Math.PI / 2 * 0.95);
      p.inner.position.y = 0.3 * p.tipped;
    }
  }

  // Strike!
  if (strikeTimer < 0 && pins.every((p) => p.tipped > 0 || p.sinking >= 0)) {
    toast('🎳 Strike! All ten pins down');
    strikeTimer = 0;
  }
  if (strikeTimer >= 0) {
    strikeTimer += dt;
    if (strikeTimer > 6) { pins.forEach(resetProp); strikeTimer = -1; }
  }
}

let lastBump = 0;
function bumpToast(type) {
  const now = performance.now();
  if (now - lastBump < 2500) return;
  lastBump = now;
  toast({ ball: 'Boing!', crate: 'Crate smash!', barrel: 'Barrel roll!', cargo: 'Heavy cargo!' }[type] || 'Bump!');
}

function update(dt, t) {
  // --- Day / night blend
  if (Math.abs(night - nightTarget) > 0.001) {
    night += Math.sign(nightTarget - night) * Math.min(Math.abs(nightTarget - night), dt * 0.8);
    applyNight(night);
  }

  // --- Respawn after a splash
  if (state.respawn >= 0) {
    state.respawn += dt;
    if (state.respawn > 1.2) {
      rover.position.set(DOCKYARD.x - 3, 0, 0);
      rover.position.y = surfaceHeight(rover.position.x, 0);
      Object.assign(state, { heading: -Math.PI / 2, speed: 0, vy: 0, grounded: true, respawn: -1, target: null });
      marker.visible = false;
    }
  }

  // --- Driving input
  let throttle = 0, steer = 0;
  if (started && state.respawn < 0) {
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
        const fx = Math.sin(state.heading), fz = Math.cos(state.heading);
        for (const o of obstacles) {
          const ox = o.x - rover.position.x, oz = o.z - rover.position.z;
          const ahead = ox * fx + oz * fz;
          const side = ox * fz - oz * fx;
          if (ahead > 0 && ahead < 5 && ahead < dist && Math.abs(side) < o.r + 1.6) steer += (side >= 0 ? -1 : 1) * (1 - ahead / 5) * 2;
        }
        steer = THREE.MathUtils.clamp(steer, -1, 1);
        throttle = Math.abs(d) > 1.6 ? 0.3 : Math.min(1, dist / 4);
      }
    }
  }

  const maxSpeed = 14;
  const control = state.grounded ? 1 : 0.25;
  state.speed += throttle * 24 * dt * control;
  if (state.grounded) state.speed *= Math.pow(0.12, dt);
  state.speed = THREE.MathUtils.clamp(state.speed, -maxSpeed * 0.5, maxSpeed);
  const turnFactor = THREE.MathUtils.clamp(Math.abs(state.speed) / 4, 0, 1) * Math.sign(state.speed || 1);
  state.heading += steer * 2.4 * dt * (state.target ? 1 : turnFactor) * (state.grounded ? 1 : 0.5);

  const fwd = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
  const wasOnPier = onPier(rover.position.x, rover.position.z);
  rover.position.x += fwd.x * state.speed * dt;
  rover.position.z += fwd.z * state.speed * dt;

  // Static obstacles (you can jump over the short ones)
  for (const o of obstacles) {
    if (rover.position.y > o.h) continue;
    const dx = rover.position.x - o.x, dz = rover.position.z - o.z;
    const d = Math.hypot(dx, dz), min = o.r + 1.1;
    if (d < min && d > 0) {
      rover.position.x = o.x + (dx / d) * min;
      rover.position.z = o.z + (dz / d) * min;
      state.speed *= 0.6;
    }
  }

  // Keep to the island unless you drive off the pier
  const inSea = !onLand(rover.position.x, rover.position.z) && !onPier(rover.position.x, rover.position.z);
  if (inSea && !wasOnPier && state.respawn < 0 && state.grounded) {
    const r = Math.hypot(rover.position.x, rover.position.z);
    rover.position.x *= (R - 1.6) / r;
    rover.position.z *= (R - 1.6) / r;
    state.speed *= 0.5;
  }

  // Vertical motion
  const ground = surfaceHeight(rover.position.x, rover.position.z);
  if (state.grounded) {
    if (ground < rover.position.y - 0.4) { state.grounded = false; state.vy = 0; }
    else rover.position.y = ground;
  }
  if (!state.grounded) {
    state.vy -= GRAVITY * dt;
    rover.position.y += state.vy * dt;
    if (rover.position.y <= ground && state.vy <= 0) {
      rover.position.y = ground;
      state.grounded = true;
      state.squash = 0.8;
      for (let i = 0; i < 8; i++) emit(rover.position.x + (rand() - 0.5) * 2, ground + 0.2, rover.position.z + (rand() - 0.5) * 2, '#e8dcc0', (rand() - 0.5) * 3, 1.5, (rand() - 0.5) * 3);
    }
  }
  if (rover.position.y < WATER_Y - 0.5 && state.respawn < 0) {
    splash(rover.position.x, rover.position.z);
    toast('Splash! Back to the dock…');
    state.respawn = 0;
    state.speed = 0;
  }

  // Tilt to the slope; nose up/down while airborne
  const rx = Math.cos(state.heading), rz = -Math.sin(state.heading);
  const hF = surfaceHeight(rover.position.x + fwd.x, rover.position.z + fwd.z), hB = surfaceHeight(rover.position.x - fwd.x, rover.position.z - fwd.z);
  const hR = surfaceHeight(rover.position.x + rx, rover.position.z + rz), hL = surfaceHeight(rover.position.x - rx, rover.position.z - rz);
  const targetPitch = state.grounded ? Math.atan2(hB - hF, 2) : THREE.MathUtils.clamp(-state.vy * 0.03, -0.4, 0.4);
  const targetRoll = state.grounded ? Math.atan2(hR - hL, 2) : 0;
  state.pitch = THREE.MathUtils.lerp(state.pitch, THREE.MathUtils.clamp(targetPitch, -0.5, 0.5), 0.2);
  state.roll = THREE.MathUtils.lerp(state.roll, THREE.MathUtils.clamp(targetRoll, -0.5, 0.5), 0.2);
  rover.rotation.set(0, state.heading, 0);
  chassis.rotation.set(state.pitch, 0, state.roll);
  state.squash = THREE.MathUtils.lerp(state.squash, 1, 0.15);
  chassis.scale.set(2 - state.squash, state.squash, 2 - state.squash);
  body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -steer * Math.min(1, Math.abs(state.speed) / maxSpeed) * 0.12, 0.1);
  for (const w of wheels) w.rotation.x += (state.speed * dt) / 0.45;
  tip.material.emissiveIntensity = 0.5 + Math.sin(t * 6) * 0.5;

  // Props
  updateProps(dt, fwd.x * state.speed, fwd.z * state.speed);

  // Dust trail
  if (state.grounded && Math.abs(state.speed) > 3 && rand() < dt * 20) {
    emit(rover.position.x - fwd.x * 1.4 + (rand() - 0.5), rover.position.y + 0.2, rover.position.z - fwd.z * 1.4, '#e8dcc0', 0, 0.8, 0);
  }
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.life -= dt * 1.4;
    p.vy -= (p.vy > 1 ? GRAVITY * 0.5 : 0) * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.scale.setScalar(1 + (1 - p.life) * 1.5);
    p.m.material.opacity = Math.max(0, p.life) * 0.7;
  }

  // Stations
  for (const s of stations) {
    s.icon.rotation.y += dt * 0.8;
    s.icon.rotation.x = Math.sin(t + s.pos.x) * 0.3;
    s.icon.position.y = 3 + Math.sin(t * 1.5 + s.pos.z) * 0.3;
    s.ring.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.3 + night * 0.8;
    s.beam.material.opacity = (s.visited ? 0.05 : 0.1 + Math.sin(t * 2) * 0.05) + night * 0.1;
    const d = Math.hypot(rover.position.x - s.pos.x, rover.position.z - s.pos.z);
    const inside = d < TRIGGER_DIST;
    if (inside && !s.inside) openPanel(s);
    if (!inside && s.inside && openStation === s) closePanel();
    s.inside = inside;
  }

  // Gems
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
    g.mesh.position.y = g.baseY + Math.sin(t * 2 + g.phase) * 0.25;
    const horiz = Math.hypot(rover.position.x - g.mesh.position.x, rover.position.z - g.mesh.position.z);
    if (horiz < 1.8 && Math.abs(rover.position.y + 1 - g.mesh.position.y) < 1.4) {
      g.collected = true;
      if (g.mesh.userData.hint) g.mesh.userData.hint.visible = false;
      toast(`+ ${g.name}`);
      updateProgress();
      if (openStation?.data.id === 'skills') panelBody.innerHTML = renderSection(openStation.data);
    }
  }

  // Ambient motion
  const wp = waterGeo.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
    wp.array[i * 3 + 1] = Math.sin(x * 0.12 + t * 1.1) * 0.12 + Math.cos(z * 0.1 + t * 0.9) * 0.12;
  }
  wp.needsUpdate = true;
  foam.scale.setScalar(1 + Math.sin(t * 1.2) * 0.008);
  for (const c of clouds) { c.position.x += c.userData.speed * dt; if (c.position.x > 90) c.position.x = -90; }
  const shipA = t * 0.03;
  cargoShip.group.position.set(Math.cos(shipA) * 75, WATER_Y + 0.6 + Math.sin(t) * 0.1, Math.sin(shipA) * 75);
  cargoShip.group.rotation.y = -shipA - Math.PI / 2;
  cargoShip.radar.rotation.y += dt * 2;
  mooredBoat.rotation.z = Math.sin(t * 1.3) * 0.05;
  mooredBoat.position.y = WATER_Y + 0.2 + Math.sin(t * 1.1) * 0.08;
  lighthouse.beamPivot.rotation.y += dt * 0.9;
  monumentOrb.rotation.y += dt * 0.5;
  marker.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
  if (night > 0.01) {
    const fa = fireflies.arr;
    fireflies.base.forEach((f, i) => {
      fa[i * 3] = f.x + Math.sin(t * 0.7 + f.ph) * 1.2;
      fa[i * 3 + 1] = f.y + Math.sin(t * 1.3 + f.ph * 2) * 0.4;
      fa[i * 3 + 2] = f.z + Math.cos(t * 0.6 + f.ph) * 1.2;
    });
    fireflies.pts.geometry.attributes.position.needsUpdate = true;
  }
  title.position.y = 8 + Math.sin(t) * 0.3;
  if (started && title.visible) {
    title.material.opacity -= dt * 2;
    if (title.material.opacity <= 0) title.visible = false;
  }

  // Camera
  if (started) {
    const back = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading)).multiplyScalar(-11.5);
    camTarget.copy(rover.position).add(back);
    camTarget.y = Math.max(rover.position.y, 0) + 7.5;
    camTarget.y = Math.max(camTarget.y, surfaceHeight(camTarget.x, camTarget.z) + 3);
    camera.position.lerp(camTarget, 1 - Math.pow(0.02, dt));
    camera.lookAt(rover.position.x, Math.max(rover.position.y, 0) + 1.5, rover.position.z);
  } else {
    camera.position.set(Math.sin(t * 0.08) * 62, 36, Math.cos(t * 0.08) * 62);
    camera.lookAt(0, 0, 0);
  }
}

// ---------- Loop ----------
const clock = new THREE.Clock();
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

// Hook for automated checks
window.__island = {
  rover, stations, gems, props, pins, state, jump, toggleNight,
  get night() { return night; },
  step(frames = 1) { for (let i = 0; i < frames; i++) update(1 / 60, clock.elapsedTime + i / 60); },
};
