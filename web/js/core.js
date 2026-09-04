const LC = window.LightweightCharts;
if (!LC || !LC.CandlestickSeries) {
  const msg = 'lightweight-charts 로드 실패: web/vendor/lwc.standalone.js 확인';
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="padding:12px;background:#8e3b3b;color:#fff">' + msg + '</div>');
  throw new Error(msg);
}

const DEF = {
  candlestick: LC.CandlestickSeries,
  line: LC.LineSeries,
  histogram: LC.HistogramSeries,
  area: LC.AreaSeries,
  baseline: LC.BaselineSeries,
};

export function createEngine(el) {
  const chart = LC.createChart(el, {
    layout: {
      background: { color: '#14161c' },
      textColor: '#d8dce6',
      panes: { separatorColor: '#2c3140', separatorHoverColor: '#3a4152' },
    },
    grid: { vertLines: { color: '#1e222b' }, horzLines: { color: '#1e222b' } },
    rightPriceScale: { borderColor: '#2c3140' },
    timeScale: { borderColor: '#2c3140', timeVisible: true, secondsVisible: false },
    crosshair: { mode: LC.CrosshairMode.Normal },
    autoSize: true,
  });

  return {
    chart,
    addSeries(type, opts, paneIndex) {
      const d = DEF[type];
      if (!d) throw new Error('unknown series type: ' + type);
      return chart.addSeries(d, opts || {}, paneIndex || 0);
    },
    removeSeries(s) { try { chart.removeSeries(s); } catch (e) {} },
    addPriceLine(s, opts) { try { return s.createPriceLine(opts); } catch (e) { return null; } },
    removePriceLine(s, l) { try { if (l) s.removePriceLine(l); } catch (e) {} },
    attachMarkers(s, list) { return LC.createSeriesMarkers(s, list || []); },
    paneCount() { return chart.panes().length; },
    trimPanes(n) {
      for (let i = chart.panes().length - 1; i >= Math.max(1, n); i--) {
        try { chart.removePane(i); } catch (e) {}
      }
    },
    getPaneHeight(i) { const p = chart.panes()[i]; return p ? Math.round(p.getHeight()) : 0; },
    setPaneHeight(i, px) { const p = chart.panes()[i]; if (p) { try { p.setHeight(px); } catch (e) {} } },
    setPaneStretch(weights) {
      const panes = chart.panes();
      const n = Math.min(panes.length, weights.length);
      for (let i = 0; i < n; i++) {
        const w = Math.max(1, weights[i] || 1);
        try { panes[i].setStretchFactor(w); } catch (e) {}
      }
    },
    getPaneHeights() { return chart.panes().map((p) => Math.round(p.getHeight())); },
    setBarSpacing(v) { chart.timeScale().applyOptions({ barSpacing: v }); },
    getBarSpacing() { return chart.timeScale().options().barSpacing; },
    setAutoScale(on) { chart.priceScale('right').applyOptions({ autoScale: !!on }); },
    scrollToRealTime() { chart.timeScale().scrollToRealTime(); },
    onRangeChange(fn) { chart.timeScale().subscribeVisibleLogicalRangeChange(fn); },
    destroy() { chart.remove(); },
  };
}
