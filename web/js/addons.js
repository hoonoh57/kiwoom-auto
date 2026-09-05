const memo = new Map();
function cached(key, fn) {
  if (memo.has(key)) return memo.get(key);
  const v = fn();
  memo.set(key, v);
  if (memo.size > 400) { const k = memo.keys().next().value; memo.delete(k); }
  return v;
}

/* ---------- 순수 계산 ---------- */
function sma(bars, len, h) {
  return cached(`${h}|sma|${len}`, () => {
    const out = []; let s = 0;
    for (let i = 0; i < bars.length; i++) {
      s += bars[i].close;
      if (i >= len) s -= bars[i - len].close;
      if (i >= len - 1) out.push({ time: bars[i].time, value: s / len });
    }
    return out;
  });
}

function emaArr(bars, len, h) {
  return cached(`${h}|ema|${len}`, () => {
    const k = 2 / (len + 1), out = new Array(bars.length).fill(null);
    let e = null;
    for (let i = 0; i < bars.length; i++) {
      e = e === null ? bars[i].close : bars[i].close * k + e * (1 - k);
      out[i] = e;
    }
    return out;
  });
}

function macdCalc(bars, f, s, sig, h) {
  return cached(`${h}|macd|${f}|${s}|${sig}`, () => {
    const ef = emaArr(bars, f, h), es = emaArr(bars, s, h);
    const line = [], hist = [], sgn = [];
    const k = 2 / (sig + 1); let sv = null;
    for (let i = 0; i < bars.length; i++) {
      if (i < s - 1) continue;
      const m = ef[i] - es[i];
      sv = sv === null ? m : m * k + sv * (1 - k);
      line.push({ time: bars[i].time, value: m });
      sgn.push({ time: bars[i].time, value: sv });
      const d = m - sv;
      hist.push({ time: bars[i].time, value: d,
                  color: d >= 0 ? 'rgba(38,166,154,.6)' : 'rgba(239,83,80,.6)' });
    }
    return { line, sgn, hist };
  });
}

function rsiCalc(bars, len, h) {
  return cached(`${h}|rsi|${len}`, () => {
    const out = []; let g = 0, l = 0;
    for (let i = 1; i < bars.length; i++) {
      const d = bars[i].close - bars[i - 1].close;
      const up = d > 0 ? d : 0, dn = d < 0 ? -d : 0;
      if (i <= len) {
        g += up / len; l += dn / len;
        if (i === len) out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
      } else {
        g = (g * (len - 1) + up) / len;
        l = (l * (len - 1) + dn) / len;
        out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
      }
    }
    return out;
  });
}

function amountCalc(bars, h) {
  return cached(`${h}|amt`, () => {
    const day = (t) => Math.floor((t + 32400) / 86400);
    let cur = -1, acc = 0;
    return bars.map((b) => {
      const d = day(b.time);
      if (d !== cur) { cur = d; acc = 0; }
      acc += b.close * b.volume;
      return { time: b.time, value: acc };
    });
  });
}

function volData(bars, h) {
  return cached(`${h}|vol`, () => bars.map((b) => ({
    time: b.time, value: b.volume,
    color: b.close >= b.open ? 'rgba(38,166,154,.55)' : 'rgba(239,83,80,.55)',
  })));
}

const won = (v) => {
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + '조';
  if (a >= 1e8) return (v / 1e8).toFixed(1) + '억';
  if (a >= 1e4) return (v / 1e4).toFixed(0) + '만';
  return String(Math.round(v));
};

/* ---------- 레지스트리 ---------- */
const registry = new Map();
const P = (props, k, d) => (props[k] === undefined ? d : props[k]);
const CANDLE_TF = new Set(['tick', '1m', '5m', '30m', '1d', '1w', '1M']);
const CANDLE_COLORS = [
  ['#26a69a', '#ef5350'], ['#5b8def', '#f2b632'],
  ['#a875e8', '#e88b75'], ['#45b8c4', '#d467a9'],
];
const codeOf = (v, d) => (/^\d{6}$/.test(String(v || '')) ? String(v) : String(d || ''));
const tfOf = (v, d) => (CANDLE_TF.has(v) ? v : d);
const dataOf = (ctx, p) => (ctx.dataFor ? ctx.dataFor(p && p.dataKey) : ctx);
const candleColors = (id) => {
  const m = /(\d+)$/.exec(id || '1');
  return CANDLE_COLORS[((m ? Number(m[1]) : 1) - 1) % CANDLE_COLORS.length];
};

function candleData(data, p, id) {
  const bars = (data && data.bars) || [];
  if (!bars.length) throw new Error(`CandleDataError(${id})`);
  if (p.compareMode === 'price') return { bars, baseValue: null, baseTime: null };
  let base = Number(p.baseValue);
  let baseTime = Number(p.baseTime) || null;
  if (!(base > 0)) {
    const first = bars.find((b) => !baseTime || b.time >= baseTime);
    base = first && Number(first.close);
    baseTime = first ? first.time : baseTime;
  }
  if (!(base > 0)) throw new Error(`CandleDataError(${id})`);
  const cv = p.compareMode === 'percent'
    ? (v) => (Number(v) / base - 1) * 100
    : (v) => (Number(v) / base) * 100;
  return {
    bars: bars.map((b) => ({ ...b, open: cv(b.open), high: cv(b.high), low: cv(b.low), close: cv(b.close) })),
    baseValue: base,
    baseTime,
  };
}

registry.set('candles', {
  // Design: D5.v6.legend-selection
  meta: { selectable: true, label: '캔들', pane: 'main', paneH: 95, auto: true, configureOnAdd: true,
    summary: (it) => `${it.props.code || '상단 종목'} ${it.props.tf || '상단 주기'} ${it.props.placement === 'pane' ? '서브' : '중첩'}`.trim(),
    schema: [
    { k: 'code', t: 'text', label: '종목코드 (빈칸: 상단)', pattern: '^(?:\\d{6})?$', maxLength: 6, def: '', create: true,
      patch: (v) => ({ code: v || null, baseTime: null, baseValue: null }) },
    { k: 'tf', t: 'select', label: '주기', def: '', create: true, options: [
      ['', '상단 주기'],
      ['tick', '틱'], ['1m', '1분'], ['5m', '5분'], ['30m', '30분'],
      ['1d', '일'], ['1w', '주'], ['1M', '월'],
    ], patch: (v) => ({ tf: v || null, baseTime: null, baseValue: null }) },
    { k: 'placement', t: 'select', label: '표시', def: 'overlay', create: true,
      options: [['overlay', '오버레이'], ['pane', '서브차트']],
      patch: (v, x) => ({ placement: v,
        paneId: v === 'pane'
          ? ((!x.props.paneId || x.props.paneId === 'main') ? `compare:${x.id}` : x.props.paneId)
          : 'main' }) },
    { k: 'paneId', t: 'text', label: '페인', maxLength: 32, def: 'main' },
    { k: 'scaleId', t: 'select', label: '가격축', def: 'auto',
      options: [['auto', '자동'], ['right', '오른쪽'], ['left', '왼쪽'], ['compare', '비교공유']] },
    { k: 'compareMode', t: 'select', label: '비교', def: 'price', create: true,
      options: [['price', '원가격'], ['percent', '등락률'], ['indexed100', '기준값100']],
      patch: (v) => ({ compareMode: v, baseTime: null, baseValue: null }) },
    { k: 'upColor', t: 'color', label: '상승색', def: '#26a69a' },
    { k: 'downColor', t: 'color', label: '하락색', def: '#ef5350' },
  ] },
  defaults: (x) => {
    const colors = candleColors(x && x.id);
    // Design: D3.v6.candle-source
    return { code: null, tf: null,
      placement: 'overlay', paneId: 'main', scaleId: x && x.id === 'candles1' ? 'right' : 'auto', compareMode: 'price',
      baseTime: null, baseValue: null, upColor: colors[0], downColor: colors[1] };
  },
  source: (it, x) => ({ code: codeOf(it.props.code, x.form.code), tf: tfOf(it.props.tf, x.form.tf) }),
  normalize: (it, x) => {
    const code = codeOf(it.props.code, x.form.code);
    const tf = tfOf(it.props.tf, x.form.tf);
    const placement = it.props.placement === 'pane' ? 'pane' : 'overlay';
    const compareMode = ['percent', 'indexed100'].includes(it.props.compareMode) ? it.props.compareMode : 'price';
    const storedPaneId = String(it.props.paneId || '');
    const paneId = placement === 'pane' && (!storedPaneId || storedPaneId === 'main')
      ? `compare:${x.id}` : (storedPaneId || 'main');
    let scaleId = String(it.props.scaleId || 'auto');
    if (scaleId === 'auto') {
      // LWC는 left/right 두 축만 가시화한다. 그 외 id는 눈금 없는 오버레이 축이 된다.
      if (placement === 'pane') scaleId = 'right';
      else if (compareMode !== 'price') scaleId = 'compare';
      else scaleId = x.axisSlot === 0 ? 'right' : (x.axisSlot === 1 ? 'left' : 'compare');
    }
    const visibleScale = scaleId === 'left' || scaleId === 'right';
    return { code, tf, dataKey: `${code}|${tf}`, placement, paneId, scaleId, visibleScale, compareMode,
      baseTime: Number(it.props.baseTime) || null, baseValue: Number(it.props.baseValue) || null,
      upColor: P(it.props, 'upColor', '#26a69a'), downColor: P(it.props, 'downColor', '#ef5350') };
  },
  version: (ctx, p) => { const d = dataOf(ctx, p); return (d && d.barsHash) || '0'; },
  ensure(ctx, p, pane) {
    const d = candleData(dataOf(ctx, p), p, ctx.itemId);
    const s = ctx.engine.addSeries('candlestick', {
      priceScaleId: p.scaleId, upColor: p.upColor, downColor: p.downColor, borderVisible: false,
      wickUpColor: p.upColor, wickDownColor: p.downColor,
      priceFormat: p.compareMode === 'price' ? { type: 'price' }
        : { type: 'price', precision: 2, minMove: 0.01 },
    }, pane);
    if (p.visibleScale) ctx.engine.setSeriesScaleOptions(s, { visible: true, autoScale: true });
    s.setData(d.bars);
    const h = { series: [s] };
    // Design: D5.v6.candles-compare
    h.derivedBase = { baseValue: d.baseValue, baseTime: d.baseTime };
    return h;
  },
  update(ctx, h, p) {
    const d = candleData(dataOf(ctx, p), p, ctx.itemId);
    h.series[0].applyOptions({ priceScaleId: p.scaleId, upColor: p.upColor, downColor: p.downColor,
      wickUpColor: p.upColor, wickDownColor: p.downColor,
      priceFormat: p.compareMode === 'price' ? { type: 'price' }
        : { type: 'price', precision: 2, minMove: 0.01 } });
    if (p.visibleScale) ctx.engine.setSeriesScaleOptions(h.series[0], { visible: true, autoScale: true });
    h.series[0].setData(d.bars);
    // Design: D5.v6.candles-compare
    h.derivedBase = { baseValue: d.baseValue, baseTime: d.baseTime };
  },
  live(ctx, h, p) {
    const d = dataOf(ctx, p);
    if (!d || !d.liveBar) return;
    const one = candleData({ bars: [d.liveBar] }, { ...p, ...h.derivedBase }, ctx.itemId).bars[0];
    if (one) h.series[0].update(one);
  },
});

registry.set('ma', {
  meta: { label: '이동평균', pane: 'main', paneH: 95, auto: true, schema: [
    { k: 'len', t: 'int', label: '기간', min: 2, max: 400, def: 20 },
    { k: 'color', t: 'color', label: '색', def: '#7fb2f0' },
    { k: 'width', t: 'int', label: '굵기', min: 1, max: 4, def: 1 },
  ] },
  defaults: () => ({ len: 60, color: '#a0c48a', width: 1 }),
  normalize: (it) => ({ len: P(it.props, 'len', 20) | 0,
                        color: P(it.props, 'color', '#7fb2f0'),
                        width: P(it.props, 'width', 1) | 0 }),
  ensure(ctx, p, pane) {
    const s = ctx.engine.addSeries('line', {
      color: p.color, lineWidth: p.width, priceLineVisible: false,
      lastValueVisible: false, crosshairMarkerVisible: false,
    }, pane);
    s.setData(sma(ctx.bars, p.len, ctx.barsHash));
    return { series: [s] };
  },
  update(ctx, h, p) {
    h.series[0].applyOptions({ color: p.color, lineWidth: p.width });
    h.series[0].setData(sma(ctx.bars, p.len, ctx.barsHash));
  },
});

registry.set('volume', {
  meta: { label: '거래량', pane: 'vol', paneH: 95, auto: true, unique: true, schema: [] },
  defaults: () => ({}),
  normalize: () => ({}),
  ensure(ctx, p, pane) {
    const s = ctx.engine.addSeries('histogram', {
      priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false,
    }, pane);
    s.setData(volData(ctx.bars, ctx.barsHash));
    return { series: [s] };
  },
  update(ctx, h) { h.series[0].setData(volData(ctx.bars, ctx.barsHash)); },
});

registry.set('macd', {
  meta: { label: 'MACD', pane: 'macd', paneH: 95, auto: true, schema: [
    { k: 'fast', t: 'int', label: '단기', min: 2, max: 100, def: 12 },
    { k: 'slow', t: 'int', label: '장기', min: 3, max: 200, def: 26 },
    { k: 'signal', t: 'int', label: '시그널', min: 2, max: 100, def: 9 },
    { k: 'macdColor', t: 'color', label: 'MACD색', def: '#5b8def' },
    { k: 'signalColor', t: 'color', label: '시그널색', def: '#e6a0c4' },
  ] },
  defaults: () => ({ fast: 12, slow: 26, signal: 9,
                     macdColor: '#5b8def', signalColor: '#e6a0c4' }),
  normalize: (it) => ({ fast: P(it.props, 'fast', 12) | 0, slow: P(it.props, 'slow', 26) | 0,
                        signal: P(it.props, 'signal', 9) | 0,
                        macdColor: P(it.props, 'macdColor', '#5b8def'),
                        signalColor: P(it.props, 'signalColor', '#e6a0c4') }),
  ensure(ctx, p, pane) {
    const d = macdCalc(ctx.bars, p.fast, p.slow, p.signal, ctx.barsHash);
    const hs = ctx.engine.addSeries('histogram', {
      priceLineVisible: false, lastValueVisible: false,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    }, pane);
    const ml = ctx.engine.addSeries('line', {
      color: p.macdColor, lineWidth: 1, priceLineVisible: false,
      lastValueVisible: false, crosshairMarkerVisible: false,
    }, pane);
    const sl = ctx.engine.addSeries('line', {
      color: p.signalColor, lineWidth: 1, priceLineVisible: false,
      lastValueVisible: false, crosshairMarkerVisible: false,
    }, pane);
    hs.setData(d.hist); ml.setData(d.line); sl.setData(d.sgn);
    return { series: [hs, ml, sl] };
  },
  update(ctx, h, p) {
    const d = macdCalc(ctx.bars, p.fast, p.slow, p.signal, ctx.barsHash);
    h.series[1].applyOptions({ color: p.macdColor });
    h.series[2].applyOptions({ color: p.signalColor });
    h.series[0].setData(d.hist); h.series[1].setData(d.line); h.series[2].setData(d.sgn);
  },
});

registry.set('rsi', {
  meta: { label: 'RSI', pane: 'rsi', paneH: 95, auto: true, schema: [
    { k: 'len', t: 'int', label: '기간', min: 2, max: 100, def: 14 },
    { k: 'upper', t: 'int', label: '과매수', min: 50, max: 99, def: 70 },
    { k: 'lower', t: 'int', label: '과매도', min: 1, max: 50, def: 30 },
    { k: 'color', t: 'color', label: '색', def: '#d4b26a' },
  ] },
  defaults: () => ({ len: 14, upper: 70, lower: 30, color: '#d4b26a' }),
  normalize: (it) => ({ len: P(it.props, 'len', 14) | 0, upper: P(it.props, 'upper', 70) | 0,
                        lower: P(it.props, 'lower', 30) | 0,
                        color: P(it.props, 'color', '#d4b26a') }),
  ensure(ctx, p, pane) {
    const s = ctx.engine.addSeries('line', {
      color: p.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: false,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
      autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
    }, pane);
    s.setData(rsiCalc(ctx.bars, p.len, ctx.barsHash));
    const lines = [p.upper, p.lower].map((v) => ctx.engine.addPriceLine(s, {
      price: v, color: '#4a5163', lineWidth: 1, lineStyle: 2,
      axisLabelVisible: true, title: String(v),
    }));
    return { series: [s], lines };
  },
  update(ctx, h, p) {
    h.series[0].applyOptions({ color: p.color });
    h.series[0].setData(rsiCalc(ctx.bars, p.len, ctx.barsHash));
    (h.lines || []).forEach((l) => ctx.engine.removePriceLine(h.series[0], l));
    h.lines = [p.upper, p.lower].map((v) => ctx.engine.addPriceLine(h.series[0], {
      price: v, color: '#4a5163', lineWidth: 1, lineStyle: 2,
      axisLabelVisible: true, title: String(v),
    }));
  },
});

registry.set('amount', {
  meta: { label: '누적거래대금', pane: 'amt', paneH: 95, auto: true, schema: [
    { k: 'color', t: 'color', label: '색', def: '#4a9d8f' },
  ] },
  defaults: () => ({ color: '#4a9d8f' }),
  normalize: (it) => ({ color: P(it.props, 'color', '#4a9d8f') }),
  ensure(ctx, p, pane) {
    const s = ctx.engine.addSeries('area', {
      lineColor: p.color, topColor: p.color + '55', bottomColor: p.color + '08',
      lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false,
      priceFormat: { type: 'custom', minMove: 1, formatter: won },
    }, pane);
    s.setData(amountCalc(ctx.bars, ctx.barsHash));
    return { series: [s] };
  },
  update(ctx, h, p) {
    h.series[0].applyOptions({ lineColor: p.color, topColor: p.color + '55',
                               bottomColor: p.color + '08' });
    h.series[0].setData(amountCalc(ctx.bars, ctx.barsHash));
  },
});

registry.set('signals', {
  meta: { label: '매매신호', pane: 'main', paneH: 95, auto: false, schema: [
    { k: 'fast', t: 'int', label: '단기MA', min: 2, max: 100, def: 5 },
    { k: 'slow', t: 'int', label: '장기MA', min: 3, max: 200, def: 20 },
  ] },
  defaults: () => ({ fast: 5, slow: 20 }),
  normalize: (it) => ({ fast: P(it.props, 'fast', 5) | 0, slow: P(it.props, 'slow', 20) | 0 }),
  ensure(ctx, p, pane) {
    const s = ctx.engine.addSeries('line', {
      color: 'rgba(0,0,0,0)', lineWidth: 1, priceLineVisible: false,
      lastValueVisible: false, crosshairMarkerVisible: false,
    }, pane);
    s.setData(ctx.bars.map((b) => ({ time: b.time, value: b.close })));
    return { series: [s], markers: ctx.engine.attachMarkers(s, ctx.markers || []) };
  },
  update(ctx, h) {
    h.series[0].setData(ctx.bars.map((b) => ({ time: b.time, value: b.close })));
    h.markers.setMarkers(ctx.markers || []);
  },
});

/* ---------- 공통 계약 ---------- */
for (const [, impl] of registry) {
  if (!impl.remove) impl.remove = (ctx, h) => h.series.forEach((s) => ctx.engine.removeSeries(s));
  if (!impl.live) impl.live = () => {};
}

export function get(kind) { return registry.get(kind); }
export function meta(kind) { const i = registry.get(kind); return i ? i.meta : null; }
export function catalog() {
  return [...registry.entries()].map(([k, v]) => ({ kind: k, ...v.meta }));
}
export function defaults(kind, ctx) { return registry.get(kind).defaults(ctx); }
export function source(kind, item, ctx) {
  const impl = registry.get(kind);
  return impl && impl.source ? impl.source(item, ctx) : null;
}
export function register(kind, impl) { registry.set(kind, impl); }
