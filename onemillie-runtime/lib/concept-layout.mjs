// Calibration against the approved 1672 × 941 concept, shared by scene and tests.
// Photo-derived depth supports bounded viewpoints; it is not a complete room scan.
export const FRAME = {width:1672,height:941,fov:55};
const tangent=Math.tan(FRAME.fov*Math.PI/360);
export function photoPoint(x,y,depth){return [(x/FRAME.width-.5)*2*tangent*FRAME.width/FRAME.height*depth,(.5-y/FRAME.height)*2*tangent*depth,-depth];}
export function projectPoint([x,y,z]){return [FRAME.width/2+x/(-z)/(2*tangent)*FRAME.height,FRAME.height/2-y/(-z)/(2*tangent)*FRAME.height];}
export function shelfDepth(x){return 2.45+(x-120)*.0026;}
export const SLEEVE_HALF_DEPTH=.011;
export function recordStack(slot){
  const column=slot%5,row=Math.floor(slot/5),group=column<3?0:1,rank=column<3?column:column-3;
  return {group:row*2+group,rank,row,px:group===0?210:350,angle:group===0?-10:-8};
}
export function recordBrowseAngle(slot,activeSlot=-1){
  const r=recordStack(slot),a=activeSlot<0?null:recordStack(activeSlot);
  return !a||a.group!==r.group||r.rank>a.rank?r.angle:r.rank===a.rank?10:40+7*(a.rank-r.rank);
}
export function rotateRecordVector([x,y,z],rx=0,ry=0,rz=0){
  const [a,b,c]=[rx,ry,rz].map(v=>v*Math.PI/180);
  [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
  [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
  return [x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c),z];
}
export function recordAnchor(slot,angle=recordStack(slot).angle){
  const r=recordStack(slot),px=r.px-r.rank*2,baseline=r.row===0?454+(px-125)*.041:629-(px-125)*.085;
  const depth=shelfDepth(r.px)-.16+r.rank*.016,bottom=photoPoint(px,baseline,depth),size=.315;
  const ry=-8,rz=r.row===0?-2.35:4.86;
  const offset=rotateRecordVector([0,size/2,0],angle,ry,rz);
  return {x:bottom[0]+offset[0],y:bottom[1]+offset[1]+size*SLEEVE_HALF_DEPTH*Math.abs(Math.sin(angle*Math.PI/180)),z:bottom[2]+offset[2],rx:angle,ry,rz,scale:size};
}
export const OBJECT_HOTSPOTS={
  records:photoPoint(250,487,shelfDepth(250)),
  turntable:photoPoint(700,614,2.68),
  workbenches:photoPoint(1510,650,3.35)
};
export const PLATTER=(()=>{const [x,y,z]=photoPoint(693,552,2.65);return {x,y,z,rx:0,ry:0,rz:0,scale:1};})();
export const SLEEVE_AT_DECK=(()=>{const [x,y,z]=photoPoint(774,535,2.63);return {x,y:y+.12,z,ry:-18,rz:0,scale:.315};})();
export const OBJECT_ZONES={
  workbench:{name:'Werkbank',point:photoPoint(1470,562,3.35)},
  floor:{name:'Vloer',point:photoPoint(1050,775,4.8)},
  turntable:{name:'Muziektafel',point:photoPoint(895,573,4.1)}
};
export const CONCEPT_VIEWS={
  overview:{position:[0,0,-.025],pixel:[836,470.5],depth:6,fov:54.5},
  records:{position:[-.03,.005,-.035],pixel:[500,477],depth:2.9,fov:24},
  turntable:{position:[-.01,.012,-.04],pixel:[690,558],depth:2.65,fov:27},
  recordAction:{position:[-.015,.008,-.025],pixel:[507,493],depth:3.7,fov:43},
  workbenches:{position:[.11,.04,-.16],pixel:[1438,477],depth:3.6,fov:33},
  projects:{position:[.11,.04,-.16],pixel:[1438,477],depth:3.6,fov:33}
};
