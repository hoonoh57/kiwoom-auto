import assert from 'node:assert/strict';
import { createRuntime } from '../web/js/runtime.js';
import * as addons from '../web/js/addons.js';

const made = [];
const removed = [];
const engine = {
  addSeries(type, options, pane) {
    const series = {
      type, options: { ...options }, pane, data: [],
      setData(rows) { this.data = rows; },
      update(row) { this.live = row; },
      applyOptions(next) { Object.assign(this.options, next); },
    };
    made.push(series);
    return series;
  },
  removeSeries(series) { removed.push(series); },
  setSeriesScaleOptions(series, options) { series.scaleOptions = { ...options }; },
  trimPanes() {}, setPaneStretch() {}, setBarSpacing() {}, setAutoScale() {},
  scrollToRealTime() { this.scrolls = (this.scrolls || 0) + 1; },
};

const bar = (time, close) => ({ time, open: close - 1, high: close + 2, low: close - 2, close, volume: 1 });
const datasets = new Map([
  ['005930|1m', { bars: [bar(1, 100), bar(2, 110)], barsHash: 'samsung', liveBar: null }],
  ['000660|1m', { bars: [bar(1, 200), bar(2, 220)], barsHash: 'sk', liveBar: null }],
  ['035720|1m', { bars: [bar(1, 50), bar(2, 55)], barsHash: 'kakao', liveBar: null }],
]);

const form = { code: '005930', tf: '1m' };
const patches = [];
const ctx = {
  engine, form, bars: datasets.get('005930|1m').bars, barsHash: 'samsung', liveBar: null,
  dataFor: (key) => datasets.get(key), patchItem: (id, patch) => patches.push([id, patch]),
};
const profile = {
  panes: [{ id: 'main', label: 'main', h: 300 }],
  items: {
    candles1: { kind: 'candles', enabled: true, visible: true, props: {
      code: '005930', tf: '1m', placement: 'overlay', paneId: 'main', scaleId: 'right',
      compareMode: 'price', baseTime: null, baseValue: null,
    } },
    candles2: { kind: 'candles', enabled: true, visible: true, props: {
      code: '000660', tf: '1m', placement: 'overlay', paneId: 'main', scaleId: 'compare',
      compareMode: 'indexed100', baseTime: 1, baseValue: 200,
    } },
  },
  order: ['candles1', 'candles2'], view: {},
};

const runtime = createRuntime({ core: engine, registry: addons });
let result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops.map((x) => [x.op, x.id]), [['ensure', 'candles1'], ['ensure', 'candles2']]);
assert.equal(made[0].options.priceScaleId, 'right');
assert.equal(made[1].options.priceScaleId, 'compare');
assert.equal(made[1].data[0].close, 100);
assert.equal(made[1].data[1].close, 110.00000000000001);

result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops, []);

profile.items.candles2.props.code = '035720';
profile.items.candles2.props.baseValue = 50;
result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops.map((x) => [x.op, x.id]), [['update', 'candles2']]);
assert.equal(made[1].data[1].close, 110.00000000000001);

profile.items.candles2.props.placement = 'pane';
profile.items.candles2.props.paneId = 'main';
profile.items.candles2.props.scaleId = 'auto';
result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops.map((x) => [x.op, x.id]), [['remove', 'candles2'], ['ensure', 'candles2']]);
assert.equal(made.at(-1).pane, 1);
assert.equal(removed.length, 1);

result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops, []);

profile.items.candles2.props.compareMode = 'percent';
profile.items.candles2.props.baseTime = null;
profile.items.candles2.props.baseValue = null;
result = runtime.apply(profile, true, ctx, false);
assert.deepEqual(result.ops.map((x) => [x.op, x.id]), [['update', 'candles2']]);
await Promise.resolve();
// [D5.v6.candles-compare] Derived comparison values never write STATE.
assert.deepEqual(patches, []);

const autoProfile = {
  panes: [{ id: 'main', label: 'main', h: 300 }],
  items: {
    candles1: { kind: 'candles', enabled: true, visible: true, props: {
      code: '005930', tf: '1m', placement: 'overlay', paneId: 'main', scaleId: 'auto',
      compareMode: 'price', baseTime: null, baseValue: null,
    } },
    candles2: { kind: 'candles', enabled: true, visible: true, props: {
      code: '000660', tf: '1m', placement: 'overlay', paneId: 'main', scaleId: 'auto',
      compareMode: 'price', baseTime: null, baseValue: null,
    } },
    candles3: { kind: 'candles', enabled: true, visible: true, props: {
      code: '035720', tf: '1m', placement: 'overlay', paneId: 'main', scaleId: 'auto',
      compareMode: 'price', baseTime: null, baseValue: null,
    } },
  },
  order: ['candles1', 'candles2', 'candles3'], view: {},
};
const madeBeforeAuto = made.length;
const autoRuntime = createRuntime({ core: engine, registry: addons });
result = autoRuntime.apply(autoProfile, true, ctx, false);
assert.deepEqual(result.ops.map((x) => [x.op, x.id]), [
  ['ensure', 'candles1'], ['ensure', 'candles2'], ['ensure', 'candles3'],
]);
const autoSeries = made.slice(madeBeforeAuto);
assert.deepEqual(autoSeries.map((s) => s.options.priceScaleId), ['right', 'left', 'compare']);
assert.deepEqual(autoSeries[0].scaleOptions, { visible: true, autoScale: true });
assert.deepEqual(autoSeries[1].scaleOptions, { visible: true, autoScale: true });
assert.equal(autoSeries[2].scaleOptions, undefined);
autoRuntime.apply(autoProfile, true, ctx, true);
autoRuntime.apply(autoProfile, true, ctx, true);
// [D5.v6.chart-range] Programmatic draw never scrolls.
assert.equal(engine.scrolls || 0, 0);

// [D3.v6.candle-source] Default candles inherit changed form inputs; explicit comparison stays pinned.
const inherited = addons.defaults('candles', { id: 'candles1', form });
assert.equal(inherited.code, null);
assert.equal(inherited.tf, null);
const followProfile = structuredClone(profile);
followProfile.items.candles1.props = inherited;
const followRuntime = createRuntime({ core: engine, registry: addons });
const first = made.length;
followRuntime.apply(followProfile, true, ctx, false);
assert.equal(made[first].data[0].close, 100);
const changed = { ...ctx, form: { code: '035720', tf: '1m' } };
const followResult = followRuntime.apply(followProfile, true, changed, false);
assert.deepEqual(followResult.ops.map(x => [x.op, x.id]), [['update', 'candles1']]);
assert.equal(made[first].data[0].close, 50);
assert.equal(made.length, first + 2);
assert.deepEqual(addons.source('candles', followProfile.items.candles1, { form: { code: '000660', tf: '5m' } }), { code: '000660', tf: '5m' });

// [D5.v6.candles-compare] Missing comparison data fails before allocating primitives.
const candle = addons.get('candles');
const invalidProps = candle.normalize({ props: { ...inherited, compareMode: 'indexed100' } }, {form, id:'candles9',axisSlot:0});
const beforeInvalid = made.length;
assert.throws(() => candle.ensure({ ...ctx, itemId:'candles9', dataFor:()=>({bars:[]}) }, invalidProps, 0), /CandleDataError\(candles9\)/);
assert.equal(made.length,beforeInvalid);
const compareHandle = candle.ensure({ ...ctx, itemId:'candles9' }, invalidProps, 0);
candle.live({ ...ctx, itemId:'candles9', dataFor:()=>({liveBar:bar(3,150)}) },compareHandle,invalidProps);
assert.equal(compareHandle.series[0].live.close,150);
assert.deepEqual(patches,[]);

console.log('[PASS] multi-symbol candles overlay/pane/locality/idempotence');
