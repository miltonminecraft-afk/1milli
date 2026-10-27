import * as pc from '/vendor/playcanvas.mjs';
const $=id=>document.getElementById(id);
const controls=[...document.querySelectorAll('button,select,input')];
const duration=19.2,offset=1/30;
let app,root,layer,cameras={},cameraKey='overview',time=0,playing=false,ready=false;
function load(name,type,url){return new Promise((resolve,reject)=>{
  const asset=new pc.Asset(name,type,{url});app.assets.add(asset);
  asset.once('load',()=>resolve(asset));asset.once('error',reject);app.assets.load(asset);
});}
function camera(key){
  cameraKey=key;for(const [id,entity] of Object.entries(cameras))entity.camera.enabled=id===key;
  $('camera').value=key;
}
function phase(t){const logical=(t<=9.6?t:19.2-t)/1.5;
  if(t>=19.199)return 'Terug in dezelfde kastplek';
  if(t>9.6)return logical>3.7?'LP van de draaitafel halen':logical>2.4?'LP terug in de hoes':'Hoes terug in de kast';
  return logical<.8?'Naar de platenkast':logical<2.4?'Hoes pakken':logical<3.7?'LP uit de hoes halen':logical<5.7?'LP op de draaitafel leggen':'LP ligt op de draaitafel';
}
function display(){
  $('time').textContent=`${time.toFixed(1).replace('.',',')} / 19,2 s`;
  $('timeline').value=String(time);$('play').textContent=playing?'Pauzeren':'Afspelen';
  $('status').textContent=time===0?'Klaar om af te spelen':phase(time);
  const p=cameras[cameraKey].getPosition(),sleeve=root.findByName('LP 01 / I Dont Want to Calm Down'),vinyl=root.findByName('Playable vinyl / I Dont Want to Calm Down');
  const v=vec=>[vec.x,vec.y,vec.z].map(n=>+n.toFixed(6));
  $('diagnostics').textContent=JSON.stringify({renderer:'PlayCanvas',scene:'Local Blender draft',
    meshObjects:root.findComponents('render').length,cameras:Object.keys(cameras).length,
    combinedClips:1,playing,time:+time.toFixed(4),camera:cameraKey,cameraPosition:v(p),
    sleevePosition:v(sleeve.getPosition()),vinylPosition:v(vinyl.getPosition()),vinylScale:v(vinyl.getLocalScale()),ownerOrderWritten:false},null,2);
}
function seek(value){time=Math.max(0,Math.min(duration,value));layer.activeStateCurrentTime=time+offset;display();}
function stop(){playing=false;if(ready)display();}
$('play').addEventListener('click',()=>{
  if(!ready)return;
  if(playing){stop();return;}
  if(time>=duration-.001)seek(0);
  camera('action');playing=true;display();
});
$('reset').addEventListener('click',()=>{stop();camera('overview');seek(0);});
$('camera').addEventListener('change',()=>{camera($('camera').value);display();});
$('timeline').addEventListener('input',()=>{stop();seek(Number($('timeline').value));});
for(const button of document.querySelectorAll('[data-time]'))button.addEventListener('click',()=>{
  stop();camera('action');seek(Number(button.dataset.time));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{
  const canvas=$('scene');
  const device=await pc.createGraphicsDevice(canvas,{deviceTypes:['webgl2'],antialias:true,alpha:false});
  app=new pc.Application(canvas,{graphicsDevice:device});
  app.setCanvasFillMode(pc.FILLMODE_NONE,canvas.parentElement.clientWidth,canvas.parentElement.clientHeight);
  app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio,1.5);app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight=new pc.Color(.14,.13,.12);
  const [asset,hdr]=await Promise.all([load('Workshop draft','container','/reference-records.glb'),load('Existing warehouse light','texture','/lighting.hdr')]);
  root=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});app.root.addChild(root);
  for(const c of root.findComponents('camera'))c.enabled=false;
  cameras={overview:root.findByName('Reference camera / fitted'),action:root.findByName('Record interaction camera'),
    workbench:root.findByName('Workbench camera / same room'),depth:root.findByName('Depth proof camera')};
  if(Object.values(cameras).some(c=>!c?.camera))throw Error('Een opgeslagen camera ontbreekt');
  for(const entity of Object.values(cameras)){
    entity.camera.clearColor=new pc.Color(.16,.17,.18);entity.camera.toneMapping=pc.TONEMAP_ACES;
  }
  const lighting=pc.EnvLighting.generateLightingSource(hdr.resource);app.scene.envAtlas=pc.EnvLighting.generateAtlas(lighting);lighting.destroy();
  app.scene.skyboxIntensity=.45;
  const sun=new pc.Entity('Review daylight');sun.addComponent('light',{type:'directional',intensity:1.25,
    color:new pc.Color(.94,.97,1),castShadows:true,shadowResolution:2048,shadowDistance:20,shadowType:pc.SHADOW_PCF5});
  sun.setEulerAngles(35,-130,0);app.root.addChild(sun);
  for(const [name,pos,intensity,color] of [['Ceiling fill',[-1.4,3.25,-4.2],.8,[1,.94,.85]],['Rear fill',[-1.4,3.2,-8.2],.5,[1,.95,.88]]]){
    const light=new pc.Entity(name);light.addComponent('light',{type:'omni',intensity,color:new pc.Color(...color),range:9,castShadows:false});light.setPosition(...pos);app.root.addChild(light);
  }
  if(asset.resource.animations.length!==1)throw Error('De hoes, LP en camera moeten één animatie delen');
  root.addComponent('anim',{activate:true});root.anim.assignAnimation('Record',asset.resource.animations[0].resource,undefined,1,false);
  layer=root.anim.baseLayer;layer.play('Record');layer.pause();
  const resize=()=>app.resizeCanvas(canvas.parentElement.clientWidth,canvas.parentElement.clientHeight);
  new ResizeObserver(resize).observe(canvas.parentElement);resize();
  app.on('update',dt=>{if(playing){seek(time+Math.min(dt,.1));if(time>=duration)stop();}});
  app.start();camera('overview');ready=true;seek(0);
  $('loading').hidden=true;for(const control of controls)control.disabled=false;
}catch(error){
  $('loading').textContent='De 3D-preview kon niet laden. De stilstaande vergelijking blijft beschikbaar.';
  $('status').textContent=String(error?.message||error);console.error(error);
}
