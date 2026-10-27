const test=require('node:test'),assert=require('node:assert/strict');
const camera=import('../ui/js/orbit-camera.mjs');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('switching from scene pivot to an off-centre selection keeps the camera position',async()=>{
 const {orbitFromPosition,orbitPosition}=await camera;
 const position={x:7,y:6,z:12},target={x:-3,y:1.2,z:4};
 const next={target,...orbitFromPosition(position,target)};
 orbitPosition(next).forEach((v,i)=>near(v,[7,6,12][i]));
 next.yaw+=90;const moved=orbitPosition(next);near(Math.hypot(...moved.map((v,i)=>v-[target.x,target.y,target.z][i])),next.distance);near(moved[1],position.y);
});
test('changing to a moved selection uses its new centre, including above-camera selections',async()=>{
 const {orbitFromPosition,orbitPosition}=await camera;
 const position={x:2,y:1,z:8};
 for(const target of [{x:15,y:3,z:-6},{x:2,y:10,z:8}])orbitPosition({target,...orbitFromPosition(position,target,47)}).forEach((v,i)=>near(v,[2,1,8][i]));
});
test('room framing fits the enclosing sphere in both wide and narrow viewports',async()=>{
 const {frameDistance}=await camera,half={x:15,y:3,z:8},radius=Math.hypot(15,3,8),vertical=25*Math.PI/180;
 for(const aspect of [.6,1,2.4]){const distance=frameDistance(half,50,aspect),horizontal=Math.atan(Math.tan(vertical)*aspect);assert.ok(Math.asin(radius/distance)<Math.min(vertical,horizontal));}
});
