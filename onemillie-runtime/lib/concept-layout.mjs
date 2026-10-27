// Calibration against the approved 1672 × 941 concept, shared by scene and tests.
// Photo-derived depth supports bounded viewpoints; it is not a complete room scan.
export const FRAME = {width:1672,height:941,fov:55};
const tangent=Math.tan(FRAME.fov*Math.PI/360);
export function photoPoint(x,y,depth){return [(x/FRAME.width-.5)*2*tangent*FRAME.width/FRAME.height*depth,(.5-y/FRAME.height)*2*tangent*depth,-depth];}
export function projectPoint([x,y,z]){return [FRAME.width/2+x/(-z)/(2*tangent)*FRAME.height,FRAME.height/2-y/(-z)/(2*tangent)*FRAME.height];}
export function shelfDepth(x){return 2.45+(x-120)*.0026;}
export function recordAnchor(slot){
  const column=slot%5,row=Math.floor(slot/5),px=[156,200,244,288,366][column];
  const baseline=row===0?454+(px-125)*.041:629-(px-125)*.085;
  const depth=shelfDepth(px)-.07,[x,y,z]=photoPoint(px,baseline,depth);
  const size=.315;
  return {x,y:y+size/2,z,ry:0,rz:0,scale:size};
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
