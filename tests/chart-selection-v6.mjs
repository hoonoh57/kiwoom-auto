// Design: D11.v6.legend-selection L1-L7
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as selection from '../web/js/screens/chart-selection.js';
import * as indicatorState from '../web/js/indicator-state.js';
import * as addons from '../web/js/addons.js';
const item = () => ({kind:'candles',enabled:true,visible:true,props:addons.defaults('candles',{id:'candles1'})});
const form={code:'005930',tf:'1m',body:{items:{candles1:item(),candles2:item()},order:['candles1','candles2'],ui:{selectedItemId:null},view:{},panes:[]}};
const original=structuredClone(form);
let writes=0;
const host={children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);}};
const document={createElement(){return {attrs:{},setAttribute(k,v){this.attrs[k]=v;}};}};
function render(){selection.renderLegend(host,form,addons,id=>{
 const p=selection.selectionPatch(form.body,id,addons.meta);
 if(p){writes++;Object.assign(form.body.ui,p.ui);render();}
},document);}
render();assert.equal(host.children.length,2);
assert.match(host.children[0].textContent,/005930.*1m.*candles1/);
assert.match(host.children[1].textContent,/005930.*1m.*candles2/);
host.children[1].onclick();assert.equal(writes,1);assert.equal(form.body.ui.selectedItemId,'candles2');
assert.equal(host.children[1].attrs['aria-pressed'],'true');
host.children[1].onclick();assert.equal(writes,1);
assert.equal(selection.contentKey(form),selection.contentKey(original));
const source=fs.readFileSync('web/js/screens/chart.js','utf8').replace(/^import .*;\r?\n/gm,'').replace('export const SCREEN','const SCREEN');
const screen=vm.runInNewContext(source+'\nSCREEN',{...selection,...indicatorState,addons,setInterval(){},DEL:'__delete__'});
let redraw=0, feeds=0, legends=0;
screen.update({contentKey:selection.contentKey(original),legend(){legends++;},resub(){feeds++;},draw(){redraw++;}},form,{});
assert.equal(legends,1);assert.equal(feeds,0);assert.equal(redraw,0);
const saved=JSON.parse(JSON.stringify(form));
assert.equal(screen.reconcileBody(saved.body,saved).ui.selectedItemId,'candles2');
saved.body.items.candles2.enabled=false;
assert.equal(screen.reconcileBody(saved.body,saved).ui.selectedItemId,null);
form.body.items.candles1.visible=false;render();assert.equal(host.children[0].disabled,true);
assert.equal(selection.selectionPatch(form.body,'missing',addons.meta),null);
const legacy=structuredClone(original);delete legacy.body.ui.selectedItemId;
assert.equal(screen.reconcileBody(legacy.body,legacy).ui.selectedItemId,null);
const generic={items:{other:{kind:'custom',enabled:true,visible:true}},order:['other'],ui:{}};
assert.deepEqual(selection.selectionPatch(generic,'other',()=>({selectable:true})),{ui:{selectedItemId:'other'}});
console.log('[PASS] D11 legend selection identity, persistence and primitive isolation');
