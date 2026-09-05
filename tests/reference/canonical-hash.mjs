// Independent reference for D8.v6.canonical-hash. Never imports product modules.

function fail(path) {
  const error = new TypeError(`CanonicalValueError(${path})`);
  error.name = 'CanonicalValueError';
  throw error;
}

export function canonicalText(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(path);
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    const parts = [];
    for (let index = 0; index < value.length; index++) {
      if (!(index in value)) fail(`${path}[${index}]`);
      parts.push(canonicalText(value[index], `${path}[${index}]`));
    }
    return '[' + parts.join(',') + ']';
  }
  if (!value || typeof value !== 'object') fail(path);
  const keys = Object.keys(value).sort();
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + canonicalText(value[key], `${path}.${key}`)).join(',') + '}';
}

export function referenceHash(value) {
  const bytes = new TextEncoder().encode(canonicalText(value));
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export const vectors = {
  P1: { body: {}, code: '005930', tf: '1m' },
  P1Code: { body: {}, code: '000660', tf: '1m' },
  P1Body: { body: { changed: true }, code: '005930', tf: '1m' },
  G1: { rect: { h: 100, w: 100, x: 0, y: 0 }, winState: 'normal' },
  G1Move: { rect: { h: 100, w: 100, x: 8, y: 0 }, winState: 'normal' },
  C1: { code: '005930', compareMode: 'price', paneId: 'main', placement: 'overlay', scaleId: 'right', tf: '1m' },
  C2: { baseTime: 0, baseValue: 100, code: '000660', compareMode: 'indexed100', paneId: 'main', placement: 'overlay', scaleId: 'compare', tf: '1m' },
  C3: { baseTime: 0, baseValue: 100, code: '035720', compareMode: 'indexed100', paneId: 'main', placement: 'overlay', scaleId: 'compare', tf: '1m' },
};

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  console.log(JSON.stringify(Object.fromEntries(Object.entries(vectors).map(([key, value]) => [key, referenceHash(value)])), null, 2));
}
