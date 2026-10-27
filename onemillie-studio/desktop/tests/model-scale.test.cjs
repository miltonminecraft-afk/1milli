const test=require('node:test'),assert=require('node:assert/strict');
const scaling=import('../ui/js/model-scale.mjs');
test('metre-sized garages and long warehouses keep their different physical dimensions',async()=>{
 const {initialModelScale}=await scaling,room={kind:'room',modelScale:null};
 for(const [x,y,z]of [[16.78,3.32,16.90],[33.39,5.72,20.69],[10.17,5.42,13.19]])assert.equal(initialModelScale(room,{x:x/2,y:y/2,z:z/2}),1);
});
test('unlabelled centimetre exports get a unit estimate while calibrated models keep their scale',async()=>{
 const {initialModelScale}=await scaling,dimensions={x:1554.89/2,y:455.8/2,z:1740.77/2};
 assert.equal(initialModelScale({kind:'room'},dimensions),.01);
 assert.equal(initialModelScale({kind:'room',modelScale:.05},dimensions),.05);
});
test('saving a measured room preserves both its source scale and adjusted instance scale',()=>{
 const {validateScene}=require('../state.cjs');const room={id:'room',name:'Loods',assetId:'r4',parentId:null,position:[0,0,0],rotation:[0,90,0],scale:[1.4,1.4,1.4],modelScale:.01};
 assert.deepEqual(validateScene({version:1,items:[room]}).items[0],room);
 for(const modelScale of [NaN,0,-1,Infinity])assert.throws(()=>validateScene({version:1,items:[{...room,modelScale}]}));
});
