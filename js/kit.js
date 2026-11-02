// Shared 3D kit: stage, tweens, cards, chips, felt table, wallet, HUD helpers, sounds
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { THREE };

// ---------- tweens ----------
const tweens = [];
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const wait = ms => new Promise(r => setTimeout(r, ms));

export function tween(obj, { position, rotation, scale, lift = 0 }, ms = 450, delay = 0) {
  return new Promise(done => tweens.push({
    obj, lift, ms, scale, done, t: -delay,
    position: position && new THREE.Vector3(...position),
    quat: rotation && new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
  }));
}
function stepTweens(dtMs) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if ((tw.t += dtMs) < 0) continue;
    if (!tw.p0) { tw.p0 = tw.obj.position.clone(); tw.q0 = tw.obj.quaternion.clone(); tw.s0 = tw.obj.scale.x; }
    const k = Math.min(1, tw.t / tw.ms), e = ease(k);
    if (tw.position) { tw.obj.position.lerpVectors(tw.p0, tw.position, e); tw.obj.position.y += Math.sin(k * Math.PI) * tw.lift; }
    if (tw.quat) tw.obj.quaternion.slerpQuaternions(tw.q0, tw.quat, e);
    if (tw.scale != null) tw.obj.scale.setScalar(tw.s0 + (tw.scale - tw.s0) * e);
    if (k === 1) { tweens.splice(i, 1); tw.done(); }
  }
}

// ---------- stage ----------
export function createStage({ cam = [0, 7.2, 7.4], target = [0, 0, 0.2], controls: useControls = true, lights = true, fog = [14, 40] } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080c);
  scene.fog = new THREE.Fog(0x07080c, ...fog);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.02, 100);
  camera.position.set(...cam);
  if (innerWidth < innerHeight) camera.position.set(cam[0], cam[1] * 1.2, cam[2] * 0.45); // portrait: look down more so the table fills the screen
  let controls = null;
  if (useControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...target);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxPolarAngle = 1.35;
  } else camera.lookAt(...target);

  if (lights) {
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x202030, 0.22));
    const spot = new THREE.SpotLight(0xfff0d8, 260, 30, 0.7, 0.7, 2);
    spot.position.set(0, 9, 2);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0002;
    spot.shadow.normalBias = 0.02;
    scene.add(spot);
  }

  // keep the table's width in view on narrow (portrait) screens by widening the vertical FOV
  const fit = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect >= 1.4 ? 38 : 2 * Math.atan(Math.tan(19 * Math.PI / 180) * 1.4 / camera.aspect) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  fit();
  addEventListener('resize', fit);
  const frames = [];
  let last = performance.now();
  renderer.setAnimationLoop(now => {
    const dt = Math.min(50, now - last); last = now;
    stepTweens(dt);
    for (const f of frames) f(dt / 1000);
    controls?.update();
    renderer.render(scene, camera);
  });
  return { renderer, scene, camera, controls, onFrame: f => frames.push(f) };
}

// ---------- canvas helpers ----------
export function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
export function toTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = w / 2, y = h / 2;
  s.moveTo(-x + r, -y); s.lineTo(x - r, -y); s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r); s.quadraticCurveTo(x, y, x - r, y); s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r); s.lineTo(-x, -y + r); s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

// ---------- cards ----------
export const CARD_W = 0.82, CARD_H = 1.14;
const RED = '#c4122f', INK = '#15151c', GOLD = '#c9a227';
const isRed = s => s === '♥' || s === '♦';
const C4 = [[.3, .2], [.7, .2], [.3, .8], [.7, .8]];
const PIPS = {
  2: [[.5, .2], [.5, .8]], 3: [[.5, .2], [.5, .5], [.5, .8]], 4: C4, 5: [...C4, [.5, .5]],
  6: [...C4, [.3, .5], [.7, .5]], 7: [...C4, [.3, .5], [.7, .5], [.5, .35]],
  8: [...C4, [.3, .5], [.7, .5], [.5, .35], [.5, .65]],
  9: [...C4, [.3, .4], [.7, .4], [.3, .6], [.7, .6], [.5, .5]],
  10: [...C4, [.3, .4], [.7, .4], [.3, .6], [.7, .6], [.5, .3], [.5, .7]],
};

function faceCanvas({ r, s }) {
  const W = 360, H = 504, [c, g] = canvas(W, H), col = isRed(s) ? RED : INK;
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fffdf7'); paper.addColorStop(1, '#efe8d8');
  g.fillStyle = paper; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col;
  const corner = () => {
    g.font = 'bold 58px Georgia, serif'; g.fillText(r, 42, 52);
    g.font = '44px serif'; g.fillText(s, 42, 104);
  };
  corner(); g.save(); g.translate(W, H); g.rotate(Math.PI); corner(); g.restore();

  if (PIPS[r]) {
    g.font = '66px serif';
    for (const [x, y] of PIPS[r]) { g.save(); g.translate(x * W, y * H); if (y > .5) g.rotate(Math.PI); g.fillText(s, 0, 0); g.restore(); }
  } else if (r === 'A') {
    g.font = '210px serif'; g.fillText(s, W / 2, H / 2 + 8);
  } else { // J Q K: framed court card
    const x = 72, y = 88, w = W - 144, h = H - 176;
    const bg = g.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, isRed(s) ? '#fbe1e1' : '#e2e7f6'); bg.addColorStop(1, '#f5e4b8');
    g.fillStyle = bg; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill();
    g.strokeStyle = GOLD; g.lineWidth = 6; g.stroke();
    g.lineWidth = 2; g.beginPath(); g.roundRect(x + 10, y + 10, w - 20, h - 20, 10); g.stroke();
    const cx = W / 2, cy = H / 2 - 108; // crown
    g.fillStyle = '#d4a62a'; g.beginPath();
    g.moveTo(cx - 42, cy + 22); g.lineTo(cx - 42, cy - 12); g.lineTo(cx - 21, cy + 4); g.lineTo(cx, cy - 22);
    g.lineTo(cx + 21, cy + 4); g.lineTo(cx + 42, cy - 12); g.lineTo(cx + 42, cy + 22); g.closePath(); g.fill();
    g.fillStyle = col; g.font = 'bold 170px Georgia, serif'; g.fillText(r, W / 2, H / 2 + 14);
    g.fillStyle = GOLD; g.font = '46px serif'; g.fillText(s, x + 36, y + 42);
    g.save(); g.translate(x + w - 36, y + h - 42); g.rotate(Math.PI); g.fillText(s, 0, 0); g.restore();
  }
  return c;
}

function backCanvas() {
  const W = 360, H = 504, [c, g] = canvas(W, H);
  g.fillStyle = '#fbf8f1'; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill();
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#8a1224'); bg.addColorStop(1, '#3a0610');
  g.save(); g.beginPath(); g.roundRect(18, 18, W - 36, H - 36, 18); g.clip();
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(227,193,114,.32)'; g.lineWidth = 1.5;
  for (let i = -H; i < W + H; i += 22) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke();
    g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke();
  }
  g.restore();
  g.strokeStyle = '#e3c172'; g.lineWidth = 4; g.beginPath(); g.roundRect(28, 28, W - 56, H - 56, 14); g.stroke();
  g.fillStyle = '#3a0610'; g.beginPath(); g.arc(W / 2, H / 2, 74, 0, 7); g.fill();
  g.lineWidth = 5; g.stroke();
  g.fillStyle = '#e3c172'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '92px serif'; g.fillText('♠', W / 2, H / 2 - 6);
  g.font = 'bold 18px Georgia, serif'; g.fillText('R O Y A L', W / 2, H / 2 + 50);
  return c;
}

let cardGeo, backMat;
const faceMats = new Map();
function getCardGeo() {
  if (cardGeo) return cardGeo;
  const g = new THREE.ShapeGeometry(roundRectShape(CARD_W, CARD_H, 0.062), 6);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / CARD_W + 0.5, p.getY(i) / CARD_H + 0.5);
  return (cardGeo = g);
}

// Card lies flat, face up (+Y). Face down = rotation z = PI.
export function makeCard(card) {
  const key = card.r + card.s;
  if (!faceMats.has(key)) faceMats.set(key, new THREE.MeshStandardMaterial({ map: toTex(faceCanvas(card)), roughness: 0.55, envMapIntensity: 0.35 }));
  backMat ||= new THREE.MeshStandardMaterial({ map: toTex(backCanvas()), roughness: 0.45, metalness: 0.1, envMapIntensity: 0.5 });
  const grp = new THREE.Group();
  const front = new THREE.Mesh(getCardGeo(), faceMats.get(key));
  front.rotation.x = -Math.PI / 2; front.position.y = 0.002;
  const back = new THREE.Mesh(getCardGeo(), backMat);
  back.rotation.x = Math.PI / 2; back.position.y = -0.002;
  for (const m of [front, back]) { m.castShadow = true; grp.add(m); }
  grp.userData.card = card;
  return grp;
}

export async function dealCard(scene, card, from, to, { faceUp = true, rotY = 0 } = {}) {
  const m = makeCard(card);
  m.position.set(...from); m.rotation.set(0, 0, Math.PI);
  scene.add(m); sfx.card();
  await tween(m, { position: to, rotation: [0, rotY, faceUp ? 0 : Math.PI], lift: 0.25 }, 420);
  return m;
}
export const flip = (m, rotY = 0) => (sfx.card(), tween(m, { rotation: [0, rotY, 0], lift: 0.3 }, 380));

export function makeShoe() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 1.15), new THREE.MeshPhysicalMaterial({ color: 0x101014, roughness: 0.3, clearcoat: 1 }));
  body.position.y = 0.16; body.castShadow = true; g.add(body);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.2), new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.25 }));
  lip.position.set(0, 0.3, 0.5); g.add(lip);
  const top = makeCard({ r: 'A', s: '♠' });
  top.rotation.set(-0.25, 0, Math.PI); top.position.set(0, 0.34, 0.05); g.add(top);
  return g;
}

// ---------- chips ----------
export const CHIP_VALUES = [10, 50, 100, 500, 1000];
export const CHIP_COLORS = { 10: '#1f5fd1', 50: '#c62828', 100: '#178a43', 500: '#1b1b1f', 1000: '#7b2cbf' };
const chipLabel = v => (v >= 1000 ? v / 1000 + 'K' : String(v));
const chipMats = {};
let chipGeo;
function chipMaterials(v) {
  if (chipMats[v]) return chipMats[v];
  const col = CHIP_COLORS[v];
  const [sc, sg] = canvas(512, 32);
  sg.fillStyle = col; sg.fillRect(0, 0, 512, 32);
  sg.fillStyle = '#fff'; for (let i = 0; i < 8; i++) sg.fillRect(i * 64 + 20, 0, 24, 32);
  const [tc, tg] = canvas(256, 256);
  tg.fillStyle = col; tg.beginPath(); tg.arc(128, 128, 128, 0, 7); tg.fill();
  tg.strokeStyle = '#fff'; tg.lineWidth = 26;
  for (let i = 0; i < 8; i++) { tg.beginPath(); tg.arc(128, 128, 114, i * Math.PI / 4, i * Math.PI / 4 + 0.32); tg.stroke(); }
  tg.fillStyle = 'rgba(255,255,255,.93)'; tg.beginPath(); tg.arc(128, 128, 70, 0, 7); tg.fill();
  tg.strokeStyle = col; tg.lineWidth = 4; tg.setLineDash([6, 6]); tg.beginPath(); tg.arc(128, 128, 61, 0, 7); tg.stroke();
  tg.fillStyle = col; tg.font = 'bold 54px Georgia, serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
  tg.fillText(chipLabel(v), 128, 132);
  const side = new THREE.MeshPhysicalMaterial({ map: toTex(sc), roughness: 0.45, clearcoat: 0.6 });
  const top = new THREE.MeshPhysicalMaterial({ map: toTex(tc), roughness: 0.4, clearcoat: 0.6 });
  return (chipMats[v] = [side, top, top]);
}
export function makeChip(v) {
  chipGeo ||= new THREE.CylinderGeometry(0.17, 0.17, 0.04, 48);
  const m = new THREE.Mesh(chipGeo, chipMaterials(v));
  m.castShadow = m.receiveShadow = true;
  m.rotation.y = Math.random() * 6.3;
  return m;
}
export function chipStack(amount) {
  const g = new THREE.Group();
  let y = 0.02, n = 0;
  for (const v of [...CHIP_VALUES].reverse()) {
    while (amount >= v && n < 24) {
      const c = makeChip(v);
      c.position.set((Math.random() - 0.5) * 0.014, y, (Math.random() - 0.5) * 0.014);
      g.add(c); y += 0.042; amount -= v; n++;
    }
  }
  return g;
}

// ---------- felt table ----------
// print(g, W, H) draws the table layout. Canvas (x, y) maps to world x = (x/W-.5)*w, z = (y/H-.5)*h.
export function makeCardTable({ w = 9, h = 5.2, print } = {}) {
  const grp = new THREE.Group();
  const [c, g] = canvas(2048, Math.round(2048 * h / w));
  const W = c.width, H = c.height;
  const grd = g.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, W * 0.62);
  grd.addColorStop(0, '#0f6b41'); grd.addColorStop(1, '#042a19');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = g.fillStyle = 'rgba(232,201,120,.85)';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  print?.(g, W, H);
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: 0.95, envMapIntensity: 0.35 }));
  felt.rotation.x = -Math.PI / 2; felt.receiveShadow = true; grp.add(felt);

  const outer = roundRectShape(w + 0.7, h + 0.7, 0.9);
  outer.holes.push(roundRectShape(w - 0.1, h - 0.1, 0.6));
  const rail = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outer, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.1, bevelSegments: 6, curveSegments: 24 }),
    new THREE.MeshPhysicalMaterial({ color: 0x2a140b, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4 }));
  rail.rotation.x = -Math.PI / 2; rail.castShadow = rail.receiveShadow = true; grp.add(rail);

  const wood = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.5, h + 1), new THREE.MeshPhysicalMaterial({ color: 0x4a2412, roughness: 0.35, clearcoat: 1 }));
  wood.position.y = -0.3; grp.add(wood);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x140f0d, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5; floor.receiveShadow = true; grp.add(floor);
  return grp;
}

// ---------- wallet (demo credits, per browser) ----------
export const fmt = v => Math.round(v).toLocaleString('th-TH');
export const wallet = {
  get() { try { const v = +localStorage.getItem('lounge-balance'); return v > 0 ? v : 10000; } catch { return 10000; } },
  set(v) {
    try { localStorage.setItem('lounge-balance', Math.max(0, Math.round(v))); } catch {}
    document.querySelectorAll('[data-balance]').forEach(e => (e.textContent = fmt(v)));
  },
};
wallet.set(wallet.get());

// ---------- HUD ----------
export function setPhase(p) { document.body.dataset.phase = p; }

export function makeLabel(stage, pos) {
  const el = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'tag' }));
  const v = new THREE.Vector3();
  stage.onFrame(() => {
    v.set(...pos).project(stage.camera);
    el.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px, ${(1 - v.y) / 2 * innerHeight}px) translate(-50%, -50%)`;
  });
  return el;
}

let toastEl, toastT;
export function toast(text, kind = '') {
  toastEl ||= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast' }));
  toastEl.textContent = text;
  toastEl.className = 'toast show ' + kind;
  clearTimeout(toastT);
  toastT = setTimeout(() => (toastEl.className = 'toast'), 2400);
}

export function chipBar(el, onPick, start = 100) {
  for (const v of CHIP_VALUES) {
    const b = document.createElement('button');
    b.className = 'chip' + (v === start ? ' on' : '');
    b.style.setProperty('--c', CHIP_COLORS[v]);
    b.textContent = chipLabel(v);
    b.onclick = () => { el.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); sfx.chip(); onPick(v); };
    el.append(b);
  }
}

// ---------- sounds (synthesised noise bursts, no audio files) ----------
let ac;
function noise(dur, freq, vol) {
  try {
    ac ||= new AudioContext();
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), gain = ac.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; gain.gain.value = vol;
    src.connect(f).connect(gain).connect(ac.destination); src.start();
  } catch {}
}
export const sfx = {
  card: () => noise(0.09, 3200, 0.5),
  chip: () => noise(0.05, 5200, 0.5),
  ball: v => noise(0.03, 2600, Math.min(1, v) * 0.9),
  thud: v => noise(0.06, 500, Math.min(1, v) * 0.8),
};
