// Hinge around the lower edge; the sleeves remain supported by the shelf.
export function stackPose(record, angle=record.angle) {
  const yaw=record.yaw*Math.PI/180,a=angle*Math.PI/180,h=record.scale/2;
  const [x,y,z]=record.bottomBlender;
  const edgeLift=.012*record.scale*Math.max(0,Math.abs(Math.sin(a))-Math.sin(8*Math.PI/180));
  return {x:x+Math.sin(yaw)*Math.sin(a)*h,y:z+Math.cos(a)*h+edgeLift,
    z:-y+Math.cos(yaw)*Math.sin(a)*h,rx:angle,ry:record.yaw,rz:0,scale:record.scale};
}
export function browseAngles(records,index) {
  const current=records[index];
  return records.map(r=>!current||r.group!==current.group||r.rank>current.rank?r.angle:
    r.rank===current.rank?18:40+8*(current.rank-r.rank));
}
export const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
