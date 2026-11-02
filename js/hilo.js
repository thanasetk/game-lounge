import { createStage, makeCardTable, makeShoe, dealCard, flip, chipStack, chipBar, tween, wait, wallet, fmt, toast, setPhase, sfx } from './kit.js';
import { newShoe, hiloRank, hiloOdds } from './rules.js';

const stage = createStage();
const { scene } = stage;
scene.add(makeCardTable({
  print(g, W, H) {
    g.font = '600 120px Georgia, serif'; g.fillText('HI · LO', W / 2, H * 0.14);
    g.font = '32px Georgia, serif'; g.fillText('GUESS THE NEXT CARD · ACE LOW · KING HIGH', W / 2, H * 0.24);
    g.lineWidth = 4; g.beginPath(); g.roundRect(W / 2 - 110, H * 0.45 - 150, 220, 300, 22); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H * 0.82, 110, 0, 7); g.stroke();
    g.font = '28px Georgia, serif'; g.fillText('POT', W / 2, H * 0.82 + 140);
  },
}));
const shoeModel = makeShoe(); shoeModel.position.set(3.4, 0, -0.8); shoeModel.rotation.y = -0.4; scene.add(shoeModel);

const SHOE = [3.3, 0.45, -0.4], CENTER = [0, 0.012, -0.26], POT_AT = [0, 0, 1.66];
const $ = id => document.getElementById(id);
let shoe = newShoe(1), bet = 0, chips = [], pot = 0, current = null, curMesh = null, pile = [], potStack = null, streak = 0;

const draw = () => { if (!shoe.length) shoe = newShoe(1); return shoe.pop(); };
function showPot(v) {
  if (potStack) scene.remove(potStack);
  potStack = chipStack(v); potStack.position.set(...POT_AT); scene.add(potStack);
}
function refresh() {
  $('bet').textContent = fmt(bet);
  $('pot').textContent = fmt(pot);
  $('streak').textContent = streak;
  if (!current) return;
  const o = hiloOdds(current.r);
  $('hi').textContent = o.hi ? `สูงกว่า ×${o.hi}` : 'สูงกว่า —';
  $('lo').textContent = o.lo ? `ต่ำกว่า ×${o.lo}` : 'ต่ำกว่า —';
  $('hi').disabled = !o.hi; $('lo').disabled = !o.lo;
}

chipBar($('chips'), v => {
  if (bet + v > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  chips.push(v); bet += v; showPot(chips); refresh();
});
$('clear').onclick = () => { chips = []; bet = 0; showPot(chips); refresh(); };

async function toPile(m) {
  pile.push(m);
  if (pile.length > 8) scene.remove(pile.shift());
  await Promise.all(pile.map((c, i) => tween(c, { position: [-3.4 + i * 0.26, 0.012 + i * 0.004, -0.26] }, 380)));
}

$('start').onclick = async () => {
  if (document.body.dataset.phase !== 'bet') return;
  if (!bet) return toast('วางชิปก่อนเริ่ม');
  if (bet > wallet.get()) return toast('เครดิตไม่พอ', 'lose');
  wallet.set(wallet.get() - bet);
  setPhase('busy');
  pot = bet; streak = 0;
  current = draw();
  curMesh = await dealCard(scene, current, SHOE, CENTER);
  refresh(); setPhase('play');
};

async function guess(dir) {
  if (document.body.dataset.phase !== 'play') return;
  setPhase('busy');
  const mult = hiloOdds(current.r)[dir];
  const next = draw();
  await toPile(curMesh);
  curMesh = await dealCard(scene, next, SHOE, CENTER, { faceUp: false });
  await flip(curMesh);
  const a = hiloRank(current.r), b = hiloRank(next.r);
  current = next;
  if (a === b) { toast('ไพ่เท่ากัน — เสมอ ไปต่อได้'); refresh(); return setPhase('play'); }
  if ((dir === 'hi') === (b > a)) {
    pot = Math.floor(pot * mult); streak++;
    showPot(pot); sfx.chip();
    toast(`ถูกต้อง! ×${mult}  กองกลาง ${fmt(pot)}`, 'win');
    refresh(); return setPhase('play');
  }
  toast(`ผิด — เสียกองกลาง ${fmt(pot)}`, 'lose');
  sfx.chip(); await tween(potStack, { position: [0, 0, -2.3], lift: 0.4 }, 550);
  await endRound();
}
$('hi').onclick = () => guess('hi');
$('lo').onclick = () => guess('lo');
$('cash').onclick = async () => {
  if (document.body.dataset.phase !== 'play') return;
  setPhase('busy');
  wallet.set(wallet.get() + pot);
  toast(`เก็บเงิน +${fmt(pot)}`, 'win'); sfx.chip();
  await tween(potStack, { position: [0, 0, 2.9], lift: 0.3 }, 500);
  await endRound();
};

async function endRound() {
  await wait(900);
  await toPile(curMesh);
  current = null; pot = 0;
  if (bet > wallet.get()) { chips = []; bet = 0; }
  showPot(chips); refresh();
  setPhase('bet');
}
refresh();
