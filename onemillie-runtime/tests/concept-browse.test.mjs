import test from 'node:test';import assert from 'node:assert/strict';
import {recordAnchor,recordBrowseAngle,rotateRecordVector,SLEEVE_HALF_DEPTH} from '../lib/concept-layout.mjs';
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function box(p){return {c:[p.x,p.y,p.z],axes:[[1,0,0],[0,1,0],[0,0,1]].map(v=>rotateRecordVector(v,p.rx,p.ry,p.rz)),half:[p.scale/2,p.scale/2,p.scale*SLEEVE_HALF_DEPTH]};}
function overlaps(a,b){const d=sub(b.c,a.c);for(const axis of [...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>cross(x,y)))]){if(dot(axis,axis)<1e-12)continue;const radius=o=>o.axes.reduce((n,v,i)=>n+Math.abs(dot(v,axis))*o.half[i],0);if(Math.abs(dot(d,axis))>=radius(a)+radius(b)-1e-7)return false;}return true;}
test('all browse selections and reverse changes keep the physical sleeves separated',()=>{
 for(let from=-1;from<10;from++)for(let to=-1;to<10;to++)for(let frame=0;frame<=20;frame++){
  const t=frame/20,poses=Array.from({length:10},(_,slot)=>{const a=recordAnchor(slot,recordBrowseAngle(slot,from)),b=recordAnchor(slot,recordBrowseAngle(slot,to));return box(Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t])));});
  for(let i=0;i<10;i++)for(let j=i+1;j<10;j++)assert.equal(overlaps(poses[i],poses[j]),false,`Sleeves ${i}/${j}, selection ${from}->${to}, frame ${frame}`);
 }
});
test('hinged browsing raises the sleeve centre without changing the catalogue slot',()=>{for(let slot=0;slot<10;slot++){const home=recordAnchor(slot),picked=recordAnchor(slot,10);assert.equal(home.scale,.315);assert.equal(picked.scale,home.scale);assert.ok(picked.z>home.z);}});
