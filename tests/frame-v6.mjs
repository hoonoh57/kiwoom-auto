// Design: D6.v6.frame-api, D7.v6.z-list
import assert from 'node:assert/strict';
import * as frame from '../web/js/frame.js';

class Element {
  constructor() { this.children = []; this.style = {}; this.dataset = {}; this.events = {}; this.classList = { toggle() {} }; }
  append(...children) { this.children.push(...children); }
  addEventListener(type, fn) { this.events[type] = fn; }
  remove() { this.removed = true; }
  querySelectorAll() { return this.children.filter(e => e.dataset.dir); }
}
globalThis.document = { createElement: () => new Element() };
globalThis.window = { removeEventListener() {}, addEventListener() {} };
let observer;
globalThis.ResizeObserver = class {
  constructor(fn) { this.fn = fn; observer = this; }
  observe() {}
  disconnect() { this.disconnected = true; }
  size(width, height) { this.fn([{ contentRect: { width, height } }]); }
};

// [D6.v6.frame-api] Lifecycle, geometry isolation, pointer identity.
const host = new Element(), focused = [];
const h = frame.createFrame(host, 'f1', { x: 4, y: 5, w: 300, h: 200 }, { focus: e => focused.push(e) });
const root = host.children[0], body = frame.getContentHost(h);
assert.equal(body, root.children[1]);
const pointer = { type: 'pointerdown', isTrusted: true };
root.events.pointerdown(pointer);
assert.equal(focused[0], pointer);
frame.setFrameZ(h, 7);
assert.equal(root.style.width, '300px');
frame.setFrameState(h, 'max', { x: 0, y: 0, w: 900, h: 700 });
assert.equal(root.style.width, '900px');
frame.setFrameRect(h, { x: 4, y: 5, w: 300, h: 200 });
frame.setFrameState(h, 'normal', null);
assert.equal(root.style.width, '300px');

// [D6.v6.frame-api] Repeated sizes and z/position changes produce no callback.
const sizes = [], ro = frame.observeResize(body, size => sizes.push(size));
observer.size(300, 170);
await Promise.resolve();
assert.deepEqual(sizes, [{ width: 300, height: 170 }]);
sizes.length = 0;
frame.setFrameZ(h, 8);
frame.setFrameRect(h, { x: 20, y: 30, w: 300, h: 200 });
observer.size(300, 170);
await Promise.resolve();
assert.equal(sizes.length, 0);
observer.size(310.2, 180.2);
observer.size(330.1, 190.1);
await Promise.resolve();
assert.deepEqual(sizes, [{ width: 330, height: 190 }]);
observer.size(400, 200);
frame.disconnectResize(ro);
await Promise.resolve();
assert.equal(sizes.length, 1);
assert.equal(observer.disconnected, true);
frame.destroyFrame(h);
assert.equal(root.removed, true);
for (const [fn, args] of [
  ['setFrameRect', [{}]], ['setFrameZ', [0]], ['setFrameVisible', [true]],
  ['setFrameTitle', ['title', 'all']], ['setFrameState', ['normal', null]],
  ['getContentHost', []], ['destroyFrame', []],
]) assert.throws(() => frame[fn](h, ...args), /InvalidFrameHandle\(f1\)/);

// [D6.v6.frame-api] Independent axes, threshold inclusion, lower target tie-break.
const candidate = Object.freeze({ x: 12, y: 13, w: 20, h: 20 });
const bounds = Object.freeze({ x: 0, y: 0, w: 100, h: 100 });
const peers = Object.freeze([Object.freeze({ x: 10, y: 15, w: 4, h: 50 })]);
assert.deepEqual(frame.snapRect(candidate, bounds, peers, 2), { x: 10, y: 15, w: 20, h: 20 });
assert.deepEqual(frame.snapRect(candidate, bounds, peers, 1), candidate);
assert.notEqual(frame.snapRect(candidate, bounds, peers, 1), candidate);
console.log('[PASS] D6.v6.frame-api/D7.v6.z-list');
