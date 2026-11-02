import { tutorial, createStage, makeCardTable, makeShoe, dealCard, flip, chipStack, chipBar, tween, wait, wallet, fmt, makeLabel, toast, setPhase, sfx } from './kit.js';
import { newShoe, bjTotal, isBlackjack } from './rules.js';

const stage = createStage();
const { scene } = stage;
scene.add(makeCardTable({
  print(g, W, H) {
    g.font = '600 66px Georgia, serif'; g.fillText('BLACKJACK PAYS 3 TO 2', W / 2, H * 0.43);
    g.font = '34px Georgia, serif'; g.fillText('DEALER MUST STAND ON ALL 17s', W / 2, H * 0.5);
    g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H * 0.8, 120, 0, 7); g.stroke();
    g.font = '28px Georgia, serif'; g.fillText('BET', W / 2, H * 0.8 + 150);
  },
}));
const shoeModel = makeShoe(); shoeModel.position.set(3.4, 0, -1.6); shoeModel.rotation.y = -0.4; scene.add(shoeModel);

const SHOE = [3.3, 0.45, -1.2], BET_AT = [0, 0, 1.56];
const pLabel = makeLabel(stage, [-1.6, 0.05, 0.45]);
const dLabel = makeLabel(stage, [-1.6, 0.05, -1.45]);
const $ = id => document.getElementById(id);
const inPhase = p => document.body.dataset.phase === p; // ignore clicks that race an animation

let shoe = newShoe(6), bet = 0, baseBet = 0, chips = [], baseChips = [], betStack = null, extras = [];
let hands = { p: [], d: [] }, meshes = { p: [], d: [] }, holeHidden = false;

const draw = () => {
  if (shoe.length < 60) { shoe = newShoe(6); toast('สับไพ่ใหม่ 6 สำรับ'); }
  return shoe.pop();
};
function showBet() {
  if (betStack) scene.remove(betStack);
  betStack = chipStack(chips); betStack.position.set(...BET_AT); scene.add(betStack);
  $('bet').textContent = fmt(bet);
}
function labels() {
  const show = cards => {
    if (!cards.length) return '';
    const { total, soft } = bjTotal(cards);
    return soft && total < 21 ? `${total - 10} / ${total}` : String(total);
  };
  pLabel.textContent = show(hands.p);
  dLabel.textContent = show(holeHidden ? hands.d.slice(0, 1) : hands.d);
}
async function give(who, faceUp = true) {
  const card = draw(), i = hands[who].length;
  hands[who].push(card);
  meshes[who].push(await dealCard(scene, card, SHOE, [-0.8 + i * 0.52, 0.012 + i * 0.004, who === 'p' ? 0.45 : -1.45], { faceUp }));
  labels();
}

chipBar($('chips'), v => {
  if (bet + v > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  chips.push(v); bet += v; showBet();
});
$('clear').onclick = () => { chips = []; bet = 0; showBet(); };

$('deal').onclick = async () => {
  if (!inPhase('bet')) return;
  if (!bet) return toast('วางชิปเดิมพันก่อน');
  if (bet > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  wallet.set(wallet.get() - bet); baseBet = bet; baseChips = [...chips];
  setPhase('busy');
  hands = { p: [], d: [] }; meshes = { p: [], d: [] }; holeHidden = true;
  await give('p'); await give('d'); await give('p'); await give('d', false);
  if (isBlackjack(hands.p) || isBlackjack(hands.d)) return finish();
  play();
};
function play() {
  $('double').disabled = hands.p.length !== 2 || wallet.get() < bet;
  setPhase('play');
}
$('hit').onclick = async () => {
  if (!inPhase('play')) return;
  setPhase('busy');
  await give('p');
  const t = bjTotal(hands.p).total;
  if (t > 21) finish(); else if (t === 21) stand(); else play();
};
$('stand').onclick = () => { if (!inPhase('play')) return; setPhase('busy'); stand(); };
$('double').onclick = async () => {
  if (!inPhase('play')) return;
  setPhase('busy');
  wallet.set(wallet.get() - bet); bet *= 2; chips = [...chips, ...chips]; showBet(); sfx.chip();
  await give('p');
  if (bjTotal(hands.p).total > 21) finish(); else stand();
};

async function reveal() {
  await flip(meshes.d[1]);
  holeHidden = false; labels();
}
async function stand() {
  await reveal();
  while (bjTotal(hands.d).total < 17) { await wait(350); await give('d'); }
  finish();
}

async function finish() {
  if (holeHidden) await reveal();
  const p = bjTotal(hands.p).total, d = bjTotal(hands.d).total;
  const pBJ = isBlackjack(hands.p), dBJ = isBlackjack(hands.d);
  let pay = 0, msg;
  if (p > 21) msg = 'แต้มเกิน 21 — เสีย';
  else if (pBJ && !dBJ) { pay = bet * 2.5; msg = 'BLACKJACK! จ่าย 3:2'; }
  else if (dBJ && !pBJ) msg = 'เจ้ามือได้ Blackjack';
  else if (d > 21) { pay = bet * 2; msg = 'เจ้ามือแต้มเกิน — คุณชนะ!'; }
  else if (p > d) { pay = bet * 2; msg = `คุณชนะ ${p} ต่อ ${d}!`; }
  else if (p === d) { pay = bet; msg = 'เสมอ — คืนเงินเดิมพัน'; }
  else msg = `เจ้ามือชนะ ${d} ต่อ ${p}`;

  await wait(300);
  if (pay > bet) {
    const win = chipStack(pay - bet); win.position.set(0, 0, -2.2); scene.add(win); extras.push(win); sfx.chip();
    await tween(win, { position: [1.35, 0, 1.56], lift: 0.4 }, 550);
  } else if (!pay) {
    sfx.chip(); await tween(betStack, { position: [0, 0, -2.3], lift: 0.4 }, 550);
  }
  toast(msg + (pay ? `  +${fmt(pay)}` : ''), pay > bet ? 'win' : pay ? '' : 'lose');
  wallet.set(wallet.get() + pay);
  await wait(1400);

  const cards = [...meshes.p, ...meshes.d];
  await Promise.all(cards.map((m, i) => tween(m, { position: [-3.4, 0.02 + i * 0.004, -1.5], rotation: [0, 0.3, Math.PI], lift: 0.2 }, 450, i * 50)));
  cards.forEach(m => scene.remove(m));
  extras.forEach(o => scene.remove(o)); extras = [];
  hands = { p: [], d: [] }; labels();
  if (baseBet <= wallet.get()) { chips = [...baseChips]; bet = baseBet; } else { chips = []; bet = 0; }
  showBet();
  setPhase('bet');
}
showBet();
tutorial('blackjack', [
  ['เป้าหมาย', 'ทำแต้มให้ <b>ใกล้ 21 ที่สุดโดยไม่เกิน</b> และสูงกว่าเจ้ามือ ถ้าเกิน 21 แพ้ทันที'],
  ['นับแต้มไพ่', 'ไพ่ 2–10 นับตามหน้าไพ่ · <b>J Q K = 10</b> · <b>A = 1 หรือ 11</b> ระบบเลือกค่าที่ดีกว่าให้เอง (ป้ายแสดงเช่น 7 / 17)'],
  ['วางเดิมพัน', 'กดชิปด้านล่างเพื่อวางเดิมพัน (กดซ้ำเพิ่มได้ · “ล้าง” เพื่อเริ่มใหม่) แล้วกด <b>แจกไพ่</b>'],
  ['ตาของคุณ', '<b>จั่ว (Hit)</b> รับไพ่เพิ่ม · <b>หยุด (Stand)</b> พอแล้ว · <b>ดับเบิล</b> เพิ่มเดิมพันเท่าตัวแล้วรับไพ่อีกใบเดียว (ใช้ได้ตอนมี 2 ใบ)'],
  ['เจ้ามือและการจ่าย', 'เจ้ามือต้องจั่วจนได้ 17 ขึ้นไป · ชนะจ่าย <b>1 : 1</b> · <b>Blackjack</b> (A + ไพ่ 10 แต้ม จาก 2 ใบแรก) จ่าย <b>3 : 2</b> · แต้มเท่ากันคืนเงิน'],
]);
