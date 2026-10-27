import test from 'node:test';
import assert from 'node:assert/strict';
import {photoPoint,projectPoint,recordAnchor,PLATTER,SLEEVE_AT_DECK} from '../lib/concept-layout.mjs';
import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from '../lib/record-motion.mjs';
test('every record rests on the corresponding photographed shelf baseline',()=>{
  for(let i=0;i<10;i++){
    const a=recordAnchor(i),[x,y]=projectPoint([a.x,a.y-a.scale/2,a.z]);
    const line=i<5?454+(x-125)*.041:629-(x-125)*.085;
    assert.ok(x>125&&x<420);assert.ok(Math.abs(y-line)<.001);
  }
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
