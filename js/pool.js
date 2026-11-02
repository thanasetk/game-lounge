import { THREE, createStage, canvas, toTex, tween, toast, sfx, panel, tutorial } from './kit.js';

// Real 9-ft table in metres: play area 2.54 x 1.27, ball Ø 57 mm
const R = 0.0286, HX = 1.27, HZ = 0.635, MAXV = 4.6, DECEL = 0.28, DRAG = 0.25, CUSHION = 0.78, SUB = 8;
const CAM_PLAY = [0, 2.1, 2.05], CAM_TOP = [0, 3.4, 0.01];

const stage = createStage({ cam: CAM_PLAY, target: [0, 0, 0.1], lights: false, fog: [6, 18] });
const { scene, camera, controls, renderer } = stage;
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.minDistance = 0.9; controls.maxDistance = 5;

// ---------- lights + lamp ----------
scene.add(new THREE.HemisphereLight(0xfff6e8, 0x1a1a22, 0.2));
for (const x of [-0.7, 0, 0.7]) {
  const s = new THREE.SpotLight(0xfff0d6, 7, 5, 0.85, 0.6, 2);
  s.position.set(x, 1.25, 0); s.target.position.set(x, 0, 0);
  if (x) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0001; }
  scene.add(s, s.target);
}
const metal = new THREE.MeshPhysicalMaterial({ color: 0x1b2a22, metalness: 0.6, roughness: 0.35, clearcoat: 1 });
const lamp = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.38), metal);
lamp.position.y = 1.32; scene.add(lamp);
const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff1d0 }));
glow.rotation.x = Math.PI / 2; glow.position.y = 1.269; scene.add(glow);
for (const x of [-0.8, 0.8]) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.2), metal);
  rod.position.set(x, 1.95, 0); scene.add(rod);
}

// ---------- table ----------
function woodTex() {
  const [c, g] = canvas(1024, 128);
  g.fillStyle = '#4a1d0e'; g.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '20,6,2' : '120,50,22'},${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 1 + Math.random() * 3; g.beginPath();
    const y = Math.random() * 128; g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 140 + i) * 4);
    g.stroke();
  }
  return toTex(c);
}
function clothTex() {
  const [c, g] = canvas(1024, 512);
  g.fillStyle = '#14497f'; g.fillRect(0, 0, 1024, 512);
  const img = g.getImageData(0, 0, 1024, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(255,255,255,.55)';
  for (const fx of [0.26, 0.74]) { g.beginPath(); g.arc(fx * 1024, 256, 4, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0.26 * 1024 - 1, 0, 2, 512); // head string
  return toTex(c);
}
const wood = new THREE.MeshPhysicalMaterial({ map: woodTex(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
const clothMat = new THREE.MeshStandardMaterial({ map: clothTex(), roughness: 0.92, envMapIntensity: 0.15 });
const cushionMat = new THREE.MeshStandardMaterial({ color: 0x113f6e, roughness: 0.9, envMapIntensity: 0.2 });
const black = new THREE.MeshBasicMaterial({ color: 0x030303 });
const leather = new THREE.MeshPhysicalMaterial({ color: 0x24140c, roughness: 0.5, clearcoat: 0.5 });
const box = (w, h, d, mat, x, y, z, shadow = true) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = shadow; scene.add(m); return m;
};

const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2 * HX + 0.12, 2 * HZ + 0.12), clothMat);
cloth.rotation.x = -Math.PI / 2; cloth.receiveShadow = true; scene.add(cloth);
// cushions (gaps at the six pockets)
for (const s of [-1, 1]) {
  for (const [a, b] of [[-HX + 0.075, -0.065], [0.065, HX - 0.075]]) box(b - a, 0.045, 0.05, cushionMat, (a + b) / 2, 0.0225, s * (HZ + 0.025));
  box(0.05, 0.045, 2 * HZ - 0.15, cushionMat, s * (HX + 0.025), 0.0225, 0);
}
// wooden rails, apron, legs, floor
for (const s of [-1, 1]) {
  box(2 * (HX + 0.19), 0.07, 0.14, wood, 0, 0.015, s * (HZ + 0.12));
  box(0.14, 0.07, 2 * (HZ + 0.05), wood, s * (HX + 0.12), 0.015, 0);
}
box(2 * HX + 0.38, 0.2, 2 * HZ + 0.38, wood, 0, -0.12, 0);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.14, 0.62, 0.14, wood, sx * (HX - 0.1), -0.53, sz * (HZ - 0.05));
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 0.85 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.84; floor.receiveShadow = true; scene.add(floor);
// diamond sights
const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf3efe6, roughness: 0.15, clearcoat: 1, iridescence: 0.6 });
const diamondGeo = new THREE.OctahedronGeometry(0.011); diamondGeo.scale(1.4, 0.15, 1);
const sight = (x, z) => { const m = new THREE.Mesh(diamondGeo, pearl); m.position.set(x, 0.051, z); scene.add(m); };
for (const s of [-1, 1]) {
  for (const k of [-3, -2, -1, 1, 2, 3]) sight(k * HX / 4, s * (HZ + 0.12));
  for (const k of [-1, 0, 1]) sight(s * (HX + 0.12), k * HZ / 2);
}
// pockets: catch point used by physics + visual hole
const POCKETS = [[-HX, -HZ], [0, -HZ - 0.025], [HX, -HZ], [-HX, HZ], [0, HZ + 0.025], [HX, HZ]].map(([x, z]) => new THREE.Vector2(x, z));
for (const p of POCKETS) {
  const vx = p.x + Math.sign(p.x) * 0.03, vz = p.y + Math.sign(p.y) * 0.03;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 32, 1, true), black);
  hole.position.set(vx, -0.01, vz); scene.add(hole);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.068, 32), black);
  cap.rotation.x = -Math.PI / 2; cap.position.set(vx, 0.0515, vz); scene.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.011, 12, 40), leather);
  rim.rotation.x = Math.PI / 2; rim.position.set(vx, 0.052, vz); scene.add(rim);
}

// ---------- balls ----------
const COL = ['#f4efe2', '#f4c20d', '#1f4fd6', '#d42020', '#5e2b8c', '#f07b13', '#0e7a3c', '#7c1f1f', '#141414'];
function ballTex(n) {
  const [c, g] = canvas(512, 256);
  g.fillStyle = n > 8 ? COL[0] : COL[n]; g.fillRect(0, 0, 512, 256);
  if (n > 8) { g.fillStyle = COL[n - 8]; g.fillRect(0, 68, 512, 120); }
  if (!n) { g.fillStyle = '#c62828'; for (const x of [128, 384]) { g.beginPath(); g.arc(x, 128, 9, 0, 7); g.fill(); } }
  else for (const x of [128, 384]) {
    g.fillStyle = '#fbf8ef'; g.beginPath(); g.arc(x, 128, 38, 0, 7); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(n, x, 131);
    if (n === 6 || n === 9) g.fillRect(x - 12, 156, 24, 4); // underline 6 / 9
  }
  return toTex(c);
}
const ballGeo = new THREE.SphereGeometry(R, 48, 32);
const balls = Array.from({ length: 16 }, (_, n) => {
  const mesh = new THREE.Mesh(ballGeo, new THREE.MeshPhysicalMaterial({ map: ballTex(n), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }));
  mesh.castShadow = true; scene.add(mesh);
  return { n, mesh, p: new THREE.Vector2(), v: new THREE.Vector2(), live: true };
});
const cue = balls[0];

// ---------- HUD ----------
const $ = id => document.getElementById(id);
let shots = 0, potted = [], scratch = false, moving = false, gameOver = false;
function hud() {
  $('shots').textContent = shots;
  $('left').textContent = 15 - potted.length;
  $('tray').innerHTML = potted.map(n => `<i style="--c:${COL[n > 8 ? n - 8 : n]}" class="${n > 8 ? 'st' : ''}">${n}</i>`).join('');
}

function rack() {
  const nums = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
  nums.splice(4, 0, 8); // 8-ball in the middle of the third row
  let k = 0;
  for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) {
    const b = balls[nums[k++]];
    b.p.set(HX / 2 + row * R * 1.7325 * 1.002, (j - row / 2) * 2 * R * 1.002);
  }
  cue.p.set(-HX / 2, 0);
  for (const b of balls) {
    b.v.set(0, 0); b.live = true;
    b.mesh.visible = true; b.mesh.scale.setScalar(1);
    b.mesh.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    b.mesh.position.set(b.p.x, R, b.p.y);
  }
  shots = 0; potted = []; scratch = false; gameOver = false; hud();
}

// ---------- physics ----------
function pot(b, pk) {
  b.live = false; b.v.set(0, 0); sfx.thud(1);
  b.sinking = tween(b.mesh, { position: [pk.x, -0.05, pk.y], scale: 0.5 }, 260).then(() => { if (!b.live) b.mesh.visible = false; });
  if (b.n) { potted.push(b.n); hud(); } else scratch = true;
}
function step(dt) {
  let any = false;
  for (const b of balls) {
    if (!b.live) continue;
    const s = b.v.length();
    if (s) b.v.multiplyScalar(Math.max(0, s - (DECEL + DRAG * s) * dt) / s);
    if (b.v.lengthSq() < 1e-6) b.v.set(0, 0); else any = true;
    b.p.addScaledVector(b.v, dt);
  }
  for (let i = 0; i < 16; i++) {
    const a = balls[i]; if (!a.live) continue;
    for (let j = i + 1; j < 16; j++) {
      const b = balls[j]; if (!b.live) continue;
      const dx = b.p.x - a.p.x, dz = b.p.y - a.p.y, d2 = dx * dx + dz * dz;
      if (d2 >= 4 * R * R || d2 === 0) continue;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, push = (2 * R - d) / 2;
      a.p.x -= nx * push; a.p.y -= nz * push; b.p.x += nx * push; b.p.y += nz * push;
      const rel = (a.v.x - b.v.x) * nx + (a.v.y - b.v.y) * nz;
      if (rel <= 0) continue;
      const imp = rel * 0.975; // equal masses, restitution ~0.95
      a.v.x -= nx * imp; a.v.y -= nz * imp; b.v.x += nx * imp; b.v.y += nz * imp;
      sfx.ball(rel / 2.5);
    }
  }
  for (const b of balls) {
    if (!b.live) continue;
    const pk = POCKETS.find(p => p.distanceTo(b.p) < 0.058);
    if (pk) { pot(b, pk); continue; }
    const ax = Math.abs(b.p.x), az = Math.abs(b.p.y), sx = Math.sign(b.p.x), sz = Math.sign(b.p.y);
    if (ax > HX - R && az < HZ - 0.06 && b.v.x * sx > 0) { b.p.x = sx * (HX - R); b.v.x *= -CUSHION; b.v.y *= 0.95; sfx.thud(Math.abs(b.v.x) / 3); }
    if (az > HZ - R && ax < HX - 0.06 && ax > 0.06 && b.v.y * sz > 0) { b.p.y = sz * (HZ - R); b.v.y *= -CUSHION; b.v.x *= 0.95; sfx.thud(Math.abs(b.v.y) / 3); }
    if (ax > HX + R * 0.5 || az > HZ + R * 0.5) { // slipped into a pocket mouth: drop it, or bounce off the jaw
      const near = POCKETS.find(p => p.distanceTo(b.p) < 0.13);
      if (near) { pot(b, near); continue; }
      if (ax > HX - R) { b.p.x = sx * (HX - R); b.v.x = -Math.abs(b.v.x) * sx * CUSHION; }
      if (az > HZ - R) { b.p.y = sz * (HZ - R); b.v.y = -Math.abs(b.v.y) * sz * CUSHION; }
    }
  }
  return any;
}

const axis = new THREE.Vector3(), q = new THREE.Quaternion();
function roll(dt) {
  for (const b of balls) {
    if (!b.live) continue;
    const s = b.v.length();
    if (s) { axis.set(b.v.y, 0, -b.v.x).normalize(); q.setFromAxisAngle(axis, s * dt / R); b.mesh.quaternion.premultiply(q); }
    b.mesh.position.set(b.p.x, R, b.p.y);
  }
}

function endOfShot() {
  if (potted.includes(8) && (potted.length < 15 || scratch))
    return over(false, potted.length < 15 ? 'ลูก 8 ลงก่อนเคลียร์ลูกอื่น' : 'ลูกขาวลงตามลูก 8');
  if (potted.length === 15) return over(true);
  if (scratch) {
    scratch = false; shots++; hud(); // foul: costs one extra shot
    cue.sinking.then(() => { // wait for the drop animation, or it would hide the re-spotted ball
      cue.p.set(-HX / 2, 0);
      while (balls.some(b => b !== cue && b.live && b.p.distanceTo(cue.p) < 2.2 * R)) cue.p.y += 2.2 * R;
      cue.live = true; cue.mesh.visible = true; cue.mesh.scale.setScalar(1);
      cue.mesh.position.set(cue.p.x, R, cue.p.y);
    });
    toast('ฟาวล์! ลูกขาวลงหลุม +1 ไม้ — วางใหม่ที่หัวโต๊ะ', 'lose');
  }
}

function over(win, why) {
  gameOver = true;
  let best = 0;
  try { best = +localStorage.getItem('pool-best') || 0; if (win && (!best || shots < best)) localStorage.setItem('pool-best', shots); } catch {}
  const body = !win ? `ลูก 8 (สีดำ) ต้องลงเป็นลูกสุดท้าย · คุณเก็บไปได้ <b>${potted.filter(n => n !== 8).length} / 14</b> ลูก`
    : !best || shots < best ? 'สถิติใหม่ของคุณ 🎉' : `สถิติดีที่สุดของคุณคือ <b>${best}</b> ไม้`;
  panel({ step: 'จบเกม', title: win ? `เคลียร์โต๊ะใน ${shots} ไม้!` : `แพ้ — ${why}`, body,
    actions: [{ label: 'เล่นใหม่', kind: 'primary', onClick: rack }] });
}

// ---------- aiming: cue stick, guide line, ghost ball ----------
function cueTex() {
  const [c, g] = canvas(16, 1024); // top = butt, bottom = tip
  const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#120804'); grd.addColorStop(0.36, '#2a140a'); grd.addColorStop(0.37, '#e8cf98'); grd.addColorStop(1, '#f1ddb0');
  g.fillStyle = grd; g.fillRect(0, 0, 16, 1024);
  g.fillStyle = '#c9a227'; g.fillRect(0, 372, 16, 10); g.fillRect(0, 40, 16, 6);
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 996, 16, 20);
  g.fillStyle = '#2a6fd1'; g.fillRect(0, 1016, 16, 8);
  return toTex(c);
}
const CUE_LEN = 1.45, cueGeo = new THREE.CylinderGeometry(0.0145, 0.0065, CUE_LEN, 24);
cueGeo.translate(0, CUE_LEN / 2, 0);
const stick = new THREE.Mesh(cueGeo, new THREE.MeshPhysicalMaterial({ map: cueTex(), roughness: 0.3, clearcoat: 1 }));
stick.castShadow = true; scene.add(stick);

const guidePos = new Float32Array(12);
const guideGeo = new THREE.BufferGeometry(); guideGeo.setAttribute('position', new THREE.BufferAttribute(guidePos, 3));
const guide = new THREE.LineSegments(guideGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.02, gapSize: 0.014, transparent: true, opacity: 0.75 }));
const ghost = new THREE.Mesh(ballGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
scene.add(guide, ghost);

const aim = new THREE.Vector2(1, 0), UP = new THREE.Vector3(0, 1, 0), back = new THREE.Vector3();
let charging = false, chargeT = 0, power = 0;

function updateAim() {
  const show = !moving && cue.live && !gameOver;
  stick.visible = guide.visible = ghost.visible = show;
  if (!show) return;
  back.set(-aim.x, Math.sin(0.09), -aim.y).normalize();
  stick.quaternion.setFromUnitVectors(UP, back);
  stick.position.set(cue.p.x, R, cue.p.y).addScaledVector(back, R + 0.014 + (charging ? power * 0.22 : 0));

  const c = cue.p;
  let t = Math.min(
    aim.x ? ((aim.x > 0 ? HX - R : -(HX - R)) - c.x) / aim.x : Infinity,
    aim.y ? ((aim.y > 0 ? HZ - R : -(HZ - R)) - c.y) / aim.y : Infinity);
  let target = null;
  for (const b of balls) {
    if (b === cue || !b.live) continue;
    const mx = c.x - b.p.x, mz = c.y - b.p.y, bq = mx * aim.x + mz * aim.y, disc = bq * bq - (mx * mx + mz * mz - 4 * R * R);
    if (disc <= 0) continue;
    const tb = -bq - Math.sqrt(disc);
    if (tb > 0 && tb < t) { t = tb; target = b; }
  }
  const ex = c.x + aim.x * t, ez = c.y + aim.y * t;
  guidePos.set([c.x, R, c.y, ex, R, ez]);
  if (target) {
    const dx = target.p.x - ex, dz = target.p.y - ez, l = Math.hypot(dx, dz);
    guidePos.set([target.p.x, R, target.p.y, target.p.x + dx / l * 0.25, R, target.p.y + dz / l * 0.25], 6);
  } else guidePos.set([ex, R, ez, ex, R, ez], 6);
  guideGeo.attributes.position.needsUpdate = true;
  guideGeo.computeBoundingSphere();
  guide.computeLineDistances();
  ghost.position.set(ex, R, ez);
}

// pointer: move = aim, hold = charge, release = shoot
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(UP, -R), hit = new THREE.Vector3();
const pointers = new Set();
function aimAt(e) {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return;
  const dx = hit.x - cue.p.x, dz = hit.z - cue.p.y, l = Math.hypot(dx, dz);
  if (l > 0.01) aim.set(dx / l, dz / l);
}
const el = renderer.domElement;
el.addEventListener('pointermove', e => { if (!moving && pointers.size <= 1) aimAt(e); });
el.addEventListener('pointerdown', e => {
  pointers.add(e.pointerId);
  if (pointers.size > 1) { charging = false; return; } // two fingers = camera
  if (e.button !== 0 || moving || !cue.live || gameOver) return;
  aimAt(e); charging = true; chargeT = 0; power = 0;
});
const release = e => {
  pointers.delete(e.pointerId);
  if (!charging) return;
  charging = false;
  if (power < 0.02) return;
  cue.v.set(aim.x, aim.y).multiplyScalar(0.08 + power * MAXV);
  sfx.ball(0.4 + power); shots++; hud(); moving = true;
  $('power').style.width = '0%';
};
el.addEventListener('pointerup', release);
el.addEventListener('pointercancel', release);
el.addEventListener('contextmenu', e => e.preventDefault());

stage.onFrame(dt => {
  if (charging) { chargeT += dt; power = (1 - Math.cos(chargeT * 2.4)) / 2; $('power').style.width = power * 100 + '%'; }
  if (moving) {
    let any = false;
    for (let i = 0; i < SUB; i++) any = step(dt / SUB) || any;
    roll(dt);
    if (!any) { moving = false; endOfShot(); }
  }
  updateAim();
});

$('rack').onclick = () => { moving = false; rack(); };
let top = false;
$('view').onclick = () => { top = !top; tween(camera, { position: top ? CAM_TOP : CAM_PLAY }, 700); $('view').textContent = top ? 'มุมเล่น' : 'มุมบน'; };
rack();
tutorial('pool', [
  ['เป้าหมาย', 'แทงลูก 1–15 ลงหลุมให้ <b>หมดโต๊ะ</b> โดยใช้จำนวนไม้ให้น้อยที่สุด · มุมขวาบนนับไม้ที่แทงและลูกที่เหลือ'],
  ['เล็งและแทง', 'ชี้เมาส์ (หรือแตะ) ไปทางที่จะแทง · <b>เส้นประและลูกเงา</b> บอกจุดที่ลูกขาวจะชน · <b>กดค้าง</b> เพื่อชาร์จแรง (ดูแถบแรง) แล้ว <b>ปล่อย</b> เพื่อแทง'],
  ['กติกา', '<b>ลูก 8 (สีดำ) ต้องลงเป็นลูกสุดท้าย</b> ถ้าลงก่อน = แพ้ · <b>ลูกขาวลงหลุม = ฟาวล์</b> นับเพิ่ม 1 ไม้ แล้ววางลูกขาวใหม่ที่หัวโต๊ะ'],
  ['มุมกล้อง', '<b>คลิกขวาลาก</b> หมุนกล้อง · <b>ล้อเมาส์</b> ซูม · ปุ่ม <b>มุมบน</b> ดูจากด้านบน · มือถือใช้ <b>สองนิ้ว</b> หมุน/ซูม'],
]);
