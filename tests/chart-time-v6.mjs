// Design: D5.v6.market-time-display / D11 timezone regression
import assert from 'node:assert/strict';
import { marketTimeOptions } from '../web/js/screens/chart-time.js';
const o = marketTimeOptions('5m');
const nxt = Date.parse('2026-09-03T23:00:00Z') / 1000;
const krx = Date.parse('2026-09-04T00:00:00Z') / 1000;
assert.equal(o.timeScale.tickMarkFormatter(nxt), '08:00');
assert.equal(o.timeScale.tickMarkFormatter(krx), '09:00');
assert.equal(o.localization.timeFormatter(nxt), '2026-09-04 08:00');
assert.equal(o.localization.timeFormatter(krx), '2026-09-04 09:00');
assert.equal(o.timeScale.tickMarkFormatter(Date.parse('2026-09-03T15:00:00Z') / 1000), '00:00');
assert.equal(marketTimeOptions('tick').timeScale.tickMarkFormatter(krx + 1), '09:00:01');
assert.equal(marketTimeOptions('1d').localization.timeFormatter({year:2026,month:9,day:4}), '2026-09-04');
assert.equal(marketTimeOptions('1d').localization.timeFormatter('2026-09-04'), '2026-09-04');
assert.equal(krx, Date.parse('2026-09-04T00:00:00Z') / 1000);
console.log('[PASS] Korean market time labels and unchanged timestamps');
