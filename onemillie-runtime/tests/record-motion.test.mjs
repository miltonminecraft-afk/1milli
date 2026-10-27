import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from '../lib/record-motion.mjs';
const room=JSON.parse(fs.readFileSync(new URL('../public/assets/room.json',import.meta.url)));
const platter=room.props.find(p=>p.id==='base-vinyl').transform;
const setup=slot=>recordTimeline({shelf:room.anchors.records[slot],sleeveAtDeck:room.anchors.sleeveAtDeck,platter});
test('every sleeve can be picked and returns to its original slot',()=>{
  for(let slot=0;slot<10;slot++){
    const path=setup(slot),home=room.anchors.records[slot];
    const initial=sampleRecordTimeline(path,0),returned=sampleRecordTimeline(path,RECORD_DURATION,true);
    assert.equal(initial.visible,false);assert.equal(returned.visible,false);
    for(const key of ['x','y','z','ry','rz','scale'])assert.equal(returned.sleeve[key],home[key]);
  }
});
test('LP emerges from the sleeve before rotating and arrives exactly on the platter',()=>{
  const path=setup(0),inside=sampleRecordTimeline(path,2.4),outside=sampleRecordTimeline(path,3.7),laid=sampleRecordTimeline(path,RECORD_DURATION);
  assert.equal(inside.visible,true);assert.equal(inside.vinyl.rx,90);
  assert.ok(outside.vinyl.x-outside.sleeve.x>.315);
  assert.equal(outside.vinyl.rx,90);assert.equal(laid.vinyl.rx,0);
  for(const key of ['x','y','z'])assert.equal(laid.vinyl[key],platter[key]);
  assert.equal(laid.sleeve.x,room.anchors.sleeveAtDeck.x);
});
test('forward and reverse animation follow the same continuous positions',()=>{
  const path=setup(5);
  for(let t=0;t<=RECORD_DURATION;t+=.1){
    const a=sampleRecordTimeline(path,t),b=sampleRecordTimeline(path,RECORD_DURATION-t,true);
    for(const part of ['sleeve','vinyl'])for(const key of ['x','y','z','rx','ry','rz'])assert.ok(Math.abs(a[part][key]-b[part][key])<1e-10);
  }
});
