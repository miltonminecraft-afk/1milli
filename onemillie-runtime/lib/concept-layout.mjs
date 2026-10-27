// Calibration against the approved 1672 × 941 concept, shared by scene and tests.
// Photo-derived depth supports bounded viewpoints; it is not a complete room scan.
export const FRAME = {width:1672,height:941,fov:55};
const tangent=Math.tan(FRAME.fov*Math.PI/360);
export function photoPoint(x,y,depth){return [(x/FRAME.width-.5)*2*tangent*FRAME.width/FRAME.height*depth,(.5-y/FRAME.height)*2*tangent*depth,-depth];}
export function projectPoint([x,y,z]){return [FRAME.width/2+x/(-z)/(2*tangent)*FRAME.height,FRAME.height/2-y/(-z)/(2*tangent)*FRAME.height];}
export function shelfDepth(x){return 2.45+(x-120)*.0026;}
export const SLEEVE_HALF_DEPTH=.011;
// One independent crate. Each cover faces the viewer; slots run front to back.
export const RECORD_CRATE=(()=>{const [x,y,z]=photoPoint(265,629-(265-125)*.085,shelfDepth(265)-.25);return {x,y,z,rx:0,ry:8,rz:4.86,width:.375,height:.155,depth:.30};})();
export function recordStack(slot){return {group:0,rank:slot,row:1,px:265,angle:-3};}
export function recordBrowseAngle(){return -3;}
export function rotateRecordVector([x,y,z],rx=0,ry=0,rz=0){
  const [a,b,c]=[rx,ry,rz].map(v=>v*Math.PI/180);
  [y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
  [x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];
  return [x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c),z];
}
export function cratePoint(x,y,z){const offset=rotateRecordVector([x,y,z],0,RECORD_CRATE.ry,RECORD_CRATE.rz);return [RECORD_CRATE.x+offset[0],RECORD_CRATE.y+offset[1],RECORD_CRATE.z+offset[2]];}
export function recordAnchor(slot,angle=-3,lift=0){
  const size=.315,ry=RECORD_CRATE.ry,rz=RECORD_CRATE.rz;
  const bottom=cratePoint(0,.016+lift,-.035-slot*.024),offset=rotateRecordVector([0,size/2,0],angle,ry,rz);
  return {x:bottom[0]+offset[0],y:bottom[1]+offset[1],z:bottom[2]+offset[2],rx:angle,ry,rz,scale:size};
}
export function recordBrowsePose(slot,activeSlot=-1){return recordAnchor(slot,-3,slot===activeSlot?.085:0);}
export const OBJECT_HOTSPOTS={
  records:photoPoint(265,650,shelfDepth(265)),
  turntable:photoPoint(700,614,2.68),
  workbenches:photoPoint(1510,650,3.35)
};
export const PLATTER=(()=>{const [x,y,z]=photoPoint(693,552,2.65);return {x,y,z,rx:0,ry:0,rz:0,scale:1};})();
export const SLEEVE_AT_DECK=(()=>{const bottom=photoPoint(790,573,2.65),offset=rotateRecordVector([0,.315/2,0],-10,-12,0);return {x:bottom[0]+offset[0],y:bottom[1]+offset[1],z:bottom[2]+offset[2],rx:-10,ry:-12,rz:0,scale:.315};})();
export const OBJECT_ZONES={
  workbench:{name:'Werkbank',point:photoPoint(1470,562,3.35)},
  floor:{name:'Vloer',point:photoPoint(1050,775,4.8)},
  turntable:{name:'Muziektafel',point:photoPoint(895,573,4.1)}
};
export const CONCEPT_VIEWS={
  overview:{position:[0,0,-.025],pixel:[836,470.5],depth:6,fov:54.5},
  records:{position:[-.03,.005,-.035],pixel:[450,532],depth:2.9,fov:23},
  turntable:{position:[-.01,.012,-.04],pixel:[690,558],depth:2.65,fov:27},
  recordAction:{position:[-.015,.008,-.025],pixel:[507,493],depth:3.7,fov:43},
  workbenches:{position:[.11,.04,-.16],pixel:[1438,477],depth:3.6,fov:33},
  projects:{position:[.11,.04,-.16],pixel:[1438,477],depth:3.6,fov:33}
};
