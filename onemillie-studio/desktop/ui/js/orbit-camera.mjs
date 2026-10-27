const radians=Math.PI/180;

export function orbitPosition({target,distance,yaw,pitch}){
 const y=yaw*radians,p=pitch*radians;
 return [target.x+distance*Math.sin(y)*Math.cos(p),target.y+distance*Math.sin(p),target.z+distance*Math.cos(y)*Math.cos(p)];
}

// Rebase the orbit without moving the camera when its selection changes.
export function orbitFromPosition(position,target,previousYaw=0){
 const x=position.x-target.x,y=position.y-target.y,z=position.z-target.z;
 const distance=Math.hypot(x,y,z);
 if(distance<.0001)return {distance:.05,yaw:previousYaw,pitch:0};
 return {distance,yaw:Math.hypot(x,z)<.0001?previousYaw:Math.atan2(x,z)/radians,pitch:Math.asin(Math.max(-1,Math.min(1,y/distance)))/radians};
}

export function frameDistance(halfExtents,verticalFov,aspect){
 const vertical=verticalFov*radians/2,horizontal=Math.atan(Math.tan(vertical)*Math.max(.01,aspect));
 return Math.max(1.5,Math.hypot(halfExtents.x,halfExtents.y,halfExtents.z)/Math.sin(Math.min(vertical,horizontal))*1.1);
}
