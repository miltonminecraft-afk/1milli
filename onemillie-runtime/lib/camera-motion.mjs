// Camera timing is elapsed time, independent of render frame rate or tab throttling.
export const CAMERA_DURATION=1150;
export function sampleCameraTransition(from,to,elapsed,duration=CAMERA_DURATION){
 const u=Math.max(0,Math.min(1,elapsed/duration)),t=u*u*(3-2*u),mix=(a,b)=>a+(b-a)*t;
 return {position:from.position.map((v,i)=>mix(v,to.position[i])),look:from.look.map((v,i)=>mix(v,to.look[i])),fov:mix(from.fov,to.fov),progress:u};
}
