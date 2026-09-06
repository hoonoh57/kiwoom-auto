// Design: D11.market-symbol-d.vectors
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as ds from '../web/js/deskspec.js';
import * as addons from '../web/js/addons.js';
import { renderLegend } from '../web/js/screens/chart-selection.js';
import { SCREEN as quote } from '../web/js/screens/quote.js';
for (const code of ['005930', '005930_AL', '000660_NX']) {
  const form = {code,tf:'5m',body:{items:{candles1:{kind:'candles',props:{code,tf:'5m'}}},order:['candles1'],ui:{}}};
  assert.equal(addons.source('candles',form.body.items.candles1,{id:'candles1',form}).code,code);
  const host={children:[],replaceChildren(){this.children=[];},append(v){this.children.push(v);}};
  const document={createElement(){return {setAttribute(){}};}};
  renderLegend(host,form,addons,()=>assert.fail('unexpected write'),document,()=> '종목명');
  assert.equal(host.children[0].textContent,`종목명 · ${code} · 5m · candles1`);
  renderLegend(host,form,addons,()=>{},document);
  assert.equal(host.children[0].textContent,`${code} · 5m · candles1`);
  const st = JSON.parse(fs.readFileSync('state/workspace.v6.fixture.json','utf8'));
  const id=Object.keys(st.forms)[0]; st.forms[id].code=code;
  assert.equal(ds.reconcileV6(st).st.forms[id].code,code);
  assert.equal(ds.symbolPatch(st,id,code,{meta:()=>({needCode:true})}).forms[id].code,code);
}
// Actual input event: suffixed Enter commits without truncation.
let pending=[];
const source=fs.readFileSync('web/js/screens/quote.js','utf8').replace('export const SCREEN','const SCREEN');
const nodes=[];
const screen=vm.runInNewContext(source+'\nSCREEN',{document:{createElement(){const n={append(){},remove(){}};nodes.push(n);return n;}},fetch:()=>new Promise(resolve=>pending.push(resolve)),setInterval(){return 1;},clearInterval(){}});
let form={code:'005930'};let changed;
const h=screen.mount({append(){}},form,{form:()=>form,setCode:v=>{changed=v;}});
h.cin.value='005930_AL';h.cin.onkeydown({key:'Enter',preventDefault(){}});
assert.equal(changed,'005930_AL');assert.equal(h.cin.maxLength,9);
form={code:'000660_NX'};
pending.shift()({json:async()=>({name:'OLD'})});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(nodes[2].textContent,undefined);
const request=h.pull();h.stop();pending.shift()({json:async()=>({name:'AFTER STOP'})});await request;
assert.equal(nodes[2].textContent,undefined);
console.log('[PASS] D11.market-symbol-d source, restoration, legend and stale quote');
