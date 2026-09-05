// Design: D3.v6.legend-selection, D7.v6.legend-selection
export function selectable(body, id, meta) {
  const item = body.items?.[id];
  return !!(item && body.order?.includes(id) && meta(item.kind)?.selectable && item.enabled !== false && item.visible !== false);
}

// Design: D7.v6.legend-selection
export function selectionPatch(body, id, meta) {
  if (!selectable(body, id, meta) || body.ui?.selectedItemId === id) return null;
  return { ui: { selectedItemId: id } };
}

// Design: D7.v6.legend-selection
export function contentKey(form) {
  const ui = { ...form.body.ui };
  delete ui.selectedItemId;
  return JSON.stringify({ ...form, body: { ...form.body, ui } });
}

// Design: D5.v6.legend-selection
export function renderLegend(host, form, catalog, patch, document) {
  host.replaceChildren();
  for (const id of form.body.order) {
    const item = form.body.items[id];
    if (!item || !catalog.meta(item.kind)?.selectable) continue;
    const source = catalog.source(item.kind, item, { id, form });
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cf-legend-item';
    button.textContent = `${source?.code || '종목 없음'} · ${source?.tf || ''} · ${id}`;
    button.disabled = !selectable(form.body, id, catalog.meta);
    button.setAttribute('aria-pressed', String(!button.disabled && form.body.ui?.selectedItemId === id));
    button.onclick = () => patch(id);
    host.append(button);
  }
}
