import test from 'node:test';
import assert from 'node:assert/strict';
import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from '../lib/record-motion.mjs';

const shelf={x:-3.1,y:1.5,z:-3.2,ry:42,scale:.4};
const sleeveAtDeck={x:-1.88,y:1.1,z:-4.93,ry:0,scale:.4};
const platter={x:-2.36,y:1.03,z:-5.22,scale:1.29};
const held={x:-2.48,y:1.53,z:-4.52,rx:0,ry:0,rz:0,scale:.4};
const waypoints={pulled:{...shelf,x:-2.73,y:1.52,z:-2.83},held,
  inside:{...held,rx:90,scale:1.29},
  extracted:{...held,x:-2.05,rx:90,scale:1.29},above:{...platter,y:1.3}};

test('measured route follows its custom pull path and clears the scaled sleeve opening',()=>{
  const route=recordTimeline({shelf,sleeveAtDeck,platter,waypoints});
  const pulled=sampleRecordTimeline(route,1.6),extracted=sampleRecordTimeline(route,3.7);
  assert.equal(pulled.sleeve.x,waypoints.pulled.x);
  assert.equal(pulled.sleeve.z,waypoints.pulled.z);
  const separation=extracted.vinyl.x-extracted.sleeve.x;
  assert.ok(separation>shelf.scale/2+.3*platter.scale/2);
  assert.equal(extracted.vinyl.scale,platter.scale);
  assert.equal(extracted.vinyl.rx,90);
});

test('custom route preserves canonical endpoints and reverses without drift',()=>{
  const route=recordTimeline({shelf,sleeveAtDeck,platter,waypoints});
  const last=sampleRecordTimeline(route,RECORD_DURATION),home=sampleRecordTimeline(route,RECORD_DURATION,true);
  for(const key of ['x','y','z','scale']){
    assert.equal(last.vinyl[key],platter[key]);
    assert.equal(last.sleeve[key],sleeveAtDeck[key]);
    assert.equal(home.sleeve[key],shelf[key]);
  }
  assert.equal(home.sleeve.ry,shelf.ry);
  for(let i=0;i<=128;i++){
    const t=i*RECORD_DURATION/128;
    const a=sampleRecordTimeline(route,t),b=sampleRecordTimeline(route,RECORD_DURATION-t,true);
    for(const part of ['sleeve','vinyl'])for(const value of Object.keys(a[part])){
      assert.ok(Number.isFinite(a[part][value]));
      assert.ok(Math.abs(a[part][value]-b[part][value])<1e-10);
    }
  }
});
