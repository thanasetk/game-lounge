import { THREE, tutorial, createStage, makeCardTable, makeShoe, dealCard, flip, chipStack, chipBar, tween, wait, wallet, fmt, makeLabel, toast, setPhase, sfx } from './kit.js';
import { newShoe, playBaccarat, bacPoint } from './rules.js';

const stage = createStage();
const { scene, camera, renderer } = stage;
const ZONES = { player: { fx: 0.27, label: 'PLAYER', pays: '1 : 1', col: '#5ab0ff' }, tie: { fx: 0.5, label: 'TIE', pays: '8 : 1', col: '#7ee08a' }, banker: { fx: 0.73, label: 'BANKER', pays: '0.95 : 1', col: '#ff7a7a' } };
const W_TABLE = 9, H_TABLE = 5.2, ZONE_FY = 0.78;
scene.add(makeCardTable({
  w: W_TABLE, h: H_TABLE,
  print(g, W, H) {
    for (const z of Object.values(ZONES)) {
      g.strokeStyle = z.col; g.lineWidth = 5;
      g.beginPath(); g.roundRect(z.fx * W - 190, ZONE_FY * H - 95, 380, 190, 30); g.stroke();
      g.fillStyle = z.col; g.font = '600 58px Georgia, serif'; g.fillText(z.label, z.fx * W, ZONE_FY * H - 20);
      g.font = '34px Georgia, serif'; g.fillText(z.pays, z.fx * W, ZONE_FY * H + 40);
    }
    g.strokeStyle = g.fillStyle = 'rgba(232,201,120,.6)'; g.lineWidth = 3;
    for (const [fx, t] of [[0.3, 'PLAYER'], [0.7, 'BANKER']]) {
      g.beginPath(); g.roundRect(fx * W - 260, 0.3 * H - 150, 520, 300, 24); g.stroke();
      g.font = '30px Georgia, serif'; g.fillText(t, fx * W, 0.3 * H + 180);
    }
    g.font = '600 46px Georgia, serif'; g.fillText('BACCARAT', W / 2, 0.52 * H);
  },
}));
const shoeModel = makeShoe(); shoeModel.position.set(3.75, 0, -2.05); shoeModel.rotation.y = -0.4; scene.add(shoeModel);

const SHOE = [3.65, 0.45, -1.65], CARD_Z = -1.04;
const zoneX = k => (ZONES[k].fx - 0.5) * W_TABLE, ZONE_Z = (ZONE_FY - 0.5) * H_TABLE;
const pLabel = makeLabel(stage, [-1.8, 0.05, 0.05]);
const bLabel = makeLabel(stage, [1.8, 0.05, 0.05]);
const $ = id => document.getElementById(id);

let shoe = newShoe(8), chip = 100, bets = { player: 0, tie: 0, banker: 0 }, placed = { player: [], tie: [], banker: [] }, stacks = {}, cards = [], road = [];
const draw = () => {
  if (shoe.length < 60) { shoe = newShoe(8); toast('สับไพ่ใหม่ 8 สำรับ'); }
  return shoe.pop();
};
const total = () => bets.player + bets.tie + bets.banker;

function showStack(k) {
  if (stacks[k]) scene.remove(stacks[k]);
  stacks[k] = chipStack(placed[k]); stacks[k].position.set(zoneX(k), 0, ZONE_Z); scene.add(stacks[k]);
  $('bet').textContent = fmt(total());
}
function place(k) {
  if (document.body.dataset.phase !== 'bet') return;
  if (total() + chip > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  bets[k] += chip; placed[k].push(chip); sfx.chip(); showStack(k);
}

chipBar($('chips'), v => (chip = v));
for (const k of Object.keys(ZONES)) $('z-' + k).onclick = () => place(k);
$('clear').onclick = () => { for (const k in bets) { bets[k] = 0; placed[k] = []; showStack(k); } };

// click a printed bet zone on the felt
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), felt = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
renderer.domElement.addEventListener('click', e => {
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(felt, hit) || Math.abs(hit.z - ZONE_Z) > 0.5) return;
  const k = Object.keys(ZONES).find(z => Math.abs(hit.x - zoneX(z)) < 0.85);
  if (k) place(k);
});

$('deal').onclick = async () => {
  if (document.body.dataset.phase !== 'bet') return;
  if (!total()) return toast('วางเดิมพันที่ PLAYER / TIE / BANKER ก่อน');
  if (total() > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  wallet.set(wallet.get() - total());
  setPhase('busy');
  const r = playBaccarat(draw);
  const spot = (side, i) => i < 2
    ? { to: [(side === 'P' ? -1.8 : 1.8) + (i - 0.5) * 0.9, 0.012, CARD_Z] }
    : { to: [side === 'P' ? -3.35 : 3.35, 0.012, CARD_Z], rotY: Math.PI / 2 }; // third card goes sideways
  const deal = async (side, i) => {
    const s = spot(side, i), m = await dealCard(scene, (side === 'P' ? r.P : r.B)[i], SHOE, s.to, { faceUp: false, rotY: s.rotY || 0 });
    cards.push(m); return { m, rotY: s.rotY || 0 };
  };
  const [p0, b0, p1, b1] = [await deal('P', 0), await deal('B', 0), await deal('P', 1), await deal('B', 1)];
  await wait(250);
  await Promise.all([flip(p0.m), flip(p1.m)]); pLabel.textContent = bacPoint(r.P.slice(0, 2));
  await wait(250);
  await Promise.all([flip(b0.m), flip(b1.m)]); bLabel.textContent = bacPoint(r.B.slice(0, 2));
  if (r.P.length === 3) { await wait(400); const c = await deal('P', 2); await flip(c.m, c.rotY); pLabel.textContent = r.pp; }
  if (r.B.length === 3) { await wait(400); const c = await deal('B', 2); await flip(c.m, c.rotY); bLabel.textContent = r.bp; }
  await settle(r);
};

async function settle(r) {
  const pay = {
    player: r.winner === 'player' ? bets.player * 2 : r.winner === 'tie' ? bets.player : 0,
    banker: r.winner === 'banker' ? bets.banker * 1.95 : r.winner === 'tie' ? bets.banker : 0,
    tie: r.winner === 'tie' ? bets.tie * 9 : 0,
  };
  const name = { player: 'PLAYER ชนะ', banker: 'BANKER ชนะ', tie: 'เสมอ (TIE)' }[r.winner];
  const natural = r.P.length === 2 && r.B.length === 2 && Math.max(r.pp, r.bp) >= 8 ? ` · Natural ${Math.max(r.pp, r.bp)}` : '';
  const sum = pay.player + pay.banker + pay.tie;

  await wait(400);
  const moves = [];
  for (const k in bets) {
    if (!bets[k]) continue;
    if (!pay[k]) { moves.push(tween(stacks[k], { position: [0, 0, -2.3], lift: 0.4 }, 550)); continue; }
    if (pay[k] > bets[k]) {
      const win = chipStack(pay[k] - bets[k]); win.position.set(0, 0, -2.2); scene.add(win); cards.push(win);
      moves.push(tween(win, { position: [zoneX(k), 0, ZONE_Z + 0.5], lift: 0.4 }, 550));
    }
  }
  if (moves.length) sfx.chip();
  await Promise.all(moves);
  toast(`${name} ${r.pp} : ${r.bp}${natural}` + (sum ? `  +${fmt(sum)}` : ''), sum > total() ? 'win' : sum ? '' : 'lose');
  wallet.set(wallet.get() + sum);
  road.push(r.winner[0].toUpperCase());
  $('road').innerHTML = road.slice(-24).map(x => `<i class="b-${x}">${x}</i>`).join('');
  await wait(1600);

  await Promise.all(cards.map((m, i) => tween(m, { position: [-3.6, 0.02 + i * 0.004, -1.6], lift: 0.2 }, 450, i * 40)));
  cards.forEach(m => scene.remove(m)); cards = [];
  pLabel.textContent = bLabel.textContent = '';
  if (total() > wallet.get()) for (const k in bets) { bets[k] = 0; placed[k] = []; } // keep the same bets for the next hand when affordable
  for (const k in bets) showStack(k);
  setPhase('bet');
}
for (const k in bets) showStack(k);
tutorial('baccarat', [
  ['เป้าหมาย', 'ทายว่าฝั่ง <b>PLAYER</b> หรือ <b>BANKER</b> จะได้แต้มใกล้ <b>9</b> มากกว่า หรือจะ <b>เสมอ (TIE)</b> · คุณไม่ต้องตัดสินใจจั่วเอง'],
  ['นับแต้ม', '<b>A = 1</b> · 2–9 ตามหน้าไพ่ · <b>10 J Q K = 0</b> · รวมแล้วนับแค่หลักหน่วย เช่น 7 + 8 = 15 → <b>5 แต้ม</b>'],
  ['ไพ่ใบที่ 3', 'ระบบจั่วให้อัตโนมัติตามกติกามาตรฐาน · ถ้า 2 ใบแรกได้ <b>8 หรือ 9</b> เรียกว่า <b>Natural</b> จบตาทันที'],
  ['วิธีแทง', 'เลือกชิป แล้วกด <b>PLAYER / TIE / BANKER</b> (หรือคลิกช่องบนโต๊ะ) แทงได้หลายช่อง แล้วกด <b>แจกไพ่</b>'],
  ['การจ่าย', 'PLAYER <b>1 : 1</b> · BANKER <b>0.95 : 1</b> (หักคอม 5%) · TIE <b>8 : 1</b> และถ้าเสมอ เดิมพัน PLAYER/BANKER ได้คืน · มุมซ้ายบนคือเค้าไพ่ย้อนหลัง'],
]);
