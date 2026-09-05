// Design: D7.v6.slot-commands, D7.v6.symbol-link
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as ds from '../web/js/deskspec.js';
const st = ds.defaultStateV6();
st.vds.vd2.enabled=true;
const f = (vd='vd1',group='3',link='follow',screen='chart') => ({vd,shareGroup:group,link,screen,code:'005930',allVd:false});
st.forms={f1:f(),f2:f(),f3:f('vd2'),f4:f('vd1','4'),f5:f('vd1','3','pin'),f6:f('vd1','3','follow','log'),f7:{...f('vd2'),allVd:true},f8:f('vd3')};
const catalog={meta:screen=>({needCode:screen!=='log'})};
st.symLink='vd';
assert.deepEqual(Object.keys(ds.symbolPatch(st,'f1','000660',catalog).forms),['f1','f2']);
st.symLink='all';
assert.deepEqual(Object.keys(ds.symbolPatch(st,'f1','000660',catalog).forms),['f1','f2','f3','f7']);
assert.deepEqual(Object.keys(ds.symbolPatch(st,'f5','000660',catalog).forms),['f5']);
assert.equal(st.forms.f1.code,'005930');
assert.equal(ds.symbolPatch(st,'f1','invalid',catalog),null);

class El {
 constructor(){this.children=[];this.style={};this.value='';}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(){} focus(){this.focused=true;} select(){}
 set innerHTML(v){this.children=[];}
}
const source=fs.readFileSync('web/js/app.js','utf8');
const nodes=new Map(['#vds','#symlink','#globalOn'].map(key=>[key,new El()]));
const activated=[],patches=[];
vm.runInNewContext(source.slice(source.indexOf('function renderTop()'),source.indexOf('\nfunction render()'))+'\nrenderTop();',{
 st,ds,document:{createElement:()=>new El()},$:key=>nodes.get(key),activateSlot:slot=>activated.push(slot),vdMenu(){},patch:(...args)=>patches.push(args)
});
assert.equal(nodes.get('#vds').children.length,8);
assert.equal(nodes.get('#vds').children[2].textContent,'+3');
nodes.get('#vds').children[2].onclick(); assert.deepEqual(activated,[3]);

let box=new El(), ended=[];
vm.runInNewContext(source.slice(source.indexOf('function askText('),source.indexOf('\nfunction askOk('))+"\naskText('name','',8, value=>ds.validateVdLabel(st,'vd1',value).ok?'':'duplicate');",{
 st,ds,document:{createElement:()=>new El()},modal:build=>build(box,v=>ended.push(v)),mkBtn:(label,cls,fn)=>({label,onclick:fn})
});
const [,input,error,row]=box.children;
input.value=st.vds.vd2.label; row.children[1].onclick();
assert.equal(ended.length,0);assert.equal(error.textContent,'duplicate');
input.value='새이름';row.children[1].onclick();assert.deepEqual(ended,['새이름']);

const single=ds.defaultStateV6();
for(const vd of Object.values(single.vds)) vd.enabled=vd.slot===1;
assert.equal(ds.resetVdPatch(single,'vd1'),null);
assert.equal(ds.validateVdLabel(single,'vd1',single.vds.vd8.label).ok,false);
single.vds.vd2.enabled=true;single.vds.vd1.z=['f1'];single.vds.vd2.z=['f2'];single.forms={f1:{...f(),allVd:true},f2:{...f('vd2'),allVd:true}};
assert.deepEqual(ds.activateSlotPatch(single,8).vds.vd8.z,['f1']);
console.log('[PASS] D7 fixed slots, rename validation and symbol groups');
