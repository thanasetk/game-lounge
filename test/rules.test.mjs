import assert from 'node:assert/strict';
import { bjTotal, isBlackjack, bacPoint, bankerDraws, playBaccarat, hiloOdds, newShoe } from '../js/rules.js';

const c = s => s.split(' ').map(x => ({ r: x, s: '♠' }));

assert.deepEqual(bjTotal(c('A K')), { total: 21, soft: true });
assert.equal(bjTotal(c('A A 9')).total, 21);
assert.deepEqual(bjTotal(c('A 6 K')), { total: 17, soft: false });
assert.equal(bjTotal(c('K Q 5')).total, 25);
assert.ok(isBlackjack(c('A J')) && !isBlackjack(c('7 7 7')));

assert.equal(bacPoint(c('9 8')), 7);
assert.equal(bacPoint(c('K 10 Q')), 0);
assert.ok(bankerDraws(5, null) && !bankerDraws(6, null));
assert.ok(bankerDraws(3, { r: '9' }) && !bankerDraws(3, { r: '8' }));
assert.ok(bankerDraws(6, { r: '7' }) && !bankerDraws(6, { r: '5' }));

// deal order P,B,P,B,(P3),(B3): player 2+3=5 draws 4 → 9; banker K+5=5 vs player third 4 → draws 2 → 7
const seq = c('2 K 3 5 4 2');
const r = playBaccarat(() => seq.shift());
assert.deepEqual([r.pp, r.bp, r.winner, r.P.length, r.B.length], [9, 7, 'player', 3, 3]);
// natural: no third cards
const nat = c('9 2 K 3');
assert.equal(playBaccarat(() => nat.shift()).B.length, 2);

assert.deepEqual(hiloOdds('A').lo, 0);
assert.equal(hiloOdds('K').hi, 0);
assert.equal(hiloOdds('7').hi, +(0.96 * 13 / 6).toFixed(2));
assert.equal(newShoe(6).length, 312);
console.log('rules ok');
