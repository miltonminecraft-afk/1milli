import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPoint,projectPoint,recordAnchor,rotateRecordVector,SLEEVE_HALF_DEPTH,RECORD_CRATE,cratePoint,PLATTER,SLEEVE_AT_DECK} from '../lib/concept-layout.mjs';
import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from '../lib/record-motion.mjs';
test('records stand inside one crate, behind its front rim and above its floor',()=>{
 for(let slot=0;slot<10;slot++){
 const a=recordAnchor(slot),offset=rotateRecordVector([0,a.scale/2,0],a.rx,a.ry,a.rz),bottom=cratePoint(0,.016,-.035-slot*.024);
 for(let i=0;i<3;i++)assert.ok(Math.abs([a.x,a.y,a.z][i]-offset[i]-bottom[i])<1e-8);
 assert.ok(a.scale<RECORD_CRATE.width-.04);assert.ok(.035+slot*.024<RECORD_CRATE.depth-.025);
 }
 const [x,y]=projectPoint([RECORD_CRATE.x,RECORD_CRATE.y,RECORD_CRATE.z]);assert.ok(Math.abs(y-(629-(x-125)*.085))<.001);
});
test('pickup clears the crate rim before moving towards the turntable',()=>{
 const shelf=recordAnchor(9),lifted={...shelf,y:shelf.y+.18},pulled={...lifted,z:shelf.z+.36};
 const frames=recordTimeline({shelf,sleeveAtDeck:SLEEVE_AT_DECK,platter:PLATTER,waypoints:{lifted,pulled}});
 for(const t of [1.25,1.4,1.6,1.9]){const p=sampleRecordTimeline(frames,t).sleeve;assert.ok(p.y-p.scale/2>RECORD_CRATE.y+RECORD_CRATE.height);}
});
test('photo calibration and the LP centre use the same projection',()=>{
  for(const p of [[125,454],[688,555],[1470,562]]){const back=projectPoint(photoPoint(...p,4));assert.ok(Math.hypot(back[0]-p[0],back[1]-p[1])<.001);}
  const [x,y]=projectPoint([PLATTER.x,PLATTER.y,PLATTER.z]);assert.ok(Math.abs(x-693)<.001&&Math.abs(y-552)<.001);
});
test('all concept records arrive at the platter and return to their unchanged slot',()=>{
  for(let i=0;i<10;i++){
    const shelf=recordAnchor(i),frames=recordTimeline({shelf,sleeveAtDeck:SLEEVE_AT_DECK,platter:PLATTER});
    const end=sampleRecordTimeline(frames,RECORD_DURATION),home=sampleRecordTimeline(frames,RECORD_DURATION,true);
    for(const k of ['x','y','z','scale']){assert.equal(end.vinyl[k],PLATTER[k]);assert.equal(home.sleeve[k],shelf[k]);}
  }
});
