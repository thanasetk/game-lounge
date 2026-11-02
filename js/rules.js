// Pure game rules (no Three.js) so they can be tested in Node: `node test/rules.test.mjs`
export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function newShoe(decks = 6) {
  const cards = [];
  for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) cards.push({ r, s });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export const rankValue = r => (r === 'A' ? 1 : 'JQK'.includes(r) ? 10 : +r);

// ---------- Blackjack ----------
export function bjTotal(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { const v = rankValue(c.r); total += v; if (v === 1) aces++; }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}
export const isBlackjack = cards => cards.length === 2 && bjTotal(cards).total === 21;

// ---------- Baccarat (Punto Banco tableau) ----------
export const bacPoint = cards => cards.reduce((s, c) => s + (rankValue(c.r) % 10), 0) % 10;

export function bankerDraws(bankerPts, playerThird) {
  if (!playerThird) return bankerPts <= 5;
  const p = rankValue(playerThird.r) % 10;
  if (bankerPts <= 2) return true;
  if (bankerPts === 3) return p !== 8;
  if (bankerPts === 4) return p >= 2 && p <= 7;
  if (bankerPts === 5) return p >= 4 && p <= 7;
  if (bankerPts === 6) return p === 6 || p === 7;
  return false;
}

export function playBaccarat(draw) {
  const P = [], B = [];
  P.push(draw()); B.push(draw()); P.push(draw()); B.push(draw());
  let third = null;
  if (bacPoint(P) < 8 && bacPoint(B) < 8) {
    if (bacPoint(P) <= 5) { third = draw(); P.push(third); }
    if (bankerDraws(bacPoint(B), third)) B.push(draw());
  }
  const pp = bacPoint(P), bp = bacPoint(B);
  return { P, B, pp, bp, winner: pp > bp ? 'player' : bp > pp ? 'banker' : 'tie' };
}

// ---------- Hi-Lo (A low .. K high, equal = push) ----------
export const hiloRank = r => RANKS.indexOf(r) + 1;
export function hiloOdds(r) {
  const v = hiloRank(r), m = n => (n ? +(0.96 * 13 / n).toFixed(2) : 0);
  return { hi: m(13 - v), lo: m(v - 1) };
}
