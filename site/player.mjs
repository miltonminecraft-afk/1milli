import * as pc from './vendor/playcanvas.mjs';
import {stackPose,browseAngles,ease} from './record-stack-motion.mjs';
import {recordTimeline,sampleRecordTimeline} from './record-motion.mjs';
const $=id=>document.getElementById(id),duration=19.2,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let app,root,cameras={},cameraKey='overview',time=0,playing=false,playStarted=0,playFrom=0,ready=false,records=[],entities=[],angles=[],browse=null,selected=0,vinyl,motion,layout;
const controls=[...document.querySelectorAll('button,select,input')];
function load(name,type,url){return new Promise((resolve,reject)=>{const a=new pc.Asset(name,type,{url});app.assets.add(a);a.once('load',()=>resolve(a));a.once('error',reject);app.assets.load(a);});}
function pose(entity,p){entity.setPosition(p.x,p.y,p.z);const y=new pc.Quat().setFromAxisAngle(pc.Vec3.UP,p.ry||0),x=new pc.Quat().setFromAxisAngle(pc.Vec3.RIGHT,p.rx||0);entity.setRotation(new pc.Quat().mul2(y,x));entity.setLocalScale(p.scale,p.scale,p.scale);}
function camera(key){cameraKey=key;for(const [id,e] of Object.entries(cameras))e.camera.enabled=id===key;$('camera').value=key;app.renderNextFrame=true;}
function route(){const home=stackPose(records[selected],angles[selected]),d=layout.motion;motion=recordTimeline({shelf:home,sleeveAtDeck:d.sleeveAtDeck,platter:d.platter,waypoints:{pulled:{...home,x:home.x+.55,y:home.y+.012,z:home.z-.055},held:d.held,inside:d.inside,extracted:d.extracted,above:d.above}});
const cover=entities[selected].findByName('LP front / '+records[selected].title)?.render?.meshInstances[0]?.material;
if(cover)for(const render of vinyl.findComponents('render'))for(const mesh of render.meshInstances)if(mesh.material.name.startsWith('Cover /'))mesh.material=cover;
}
function frame(){const t=time/1.5;return sampleRecordTimeline(motion,t>6.4?t-6.4:t,t>6.4);}
function updateScene(){
  for(let i=0;i<records.length;i++)pose(entities[i],stackPose(records[i],angles[i]));
  vinyl.enabled=time>0&&time<duration;
  if(time>0&&time<duration){const f=frame();pose(entities[selected],f.sleeve);pose(vinyl,f.vinyl);vinyl.enabled=f.visible;}
  const overview=cameras.overview.getPosition(),forward=cameras.overview.forward,deck=layout.motion.platter;
  const keys=[[0,[overview.x,overview.y,overview.z],[overview.x+forward.x*4,overview.y+forward.y*4,overview.z+forward.z*4]],
    [.8,[-1.5,1.6,-2.4],[-3.15,1.3,-3.65]],[1.6,[-1.5,1.6,-2.4],[-3.15,1.3,-3.65]],
    [2.4,[-1.4,1.75,-3.6],[-2.4,1.45,-4.6]],[3.7,[-1.4,1.75,-3.6],[-2.4,1.45,-4.6]],
    [4.8,[-1.55,1.7,-4.1],[deck.x,deck.y,deck.z]],[6.4,[-1.55,1.7,-4.1],[deck.x,deck.y,deck.z]]];
  const t=time<=9.6?time/1.5:(19.2-time)/1.5;let k=0;while(k<keys.length-2&&t>=keys[k+1][0])k++;
  const a=keys[k],b=keys[k+1],u=ease((t-a[0])/(b[0]-a[0])),mix=i=>a[i].map((v,j)=>v+(b[i][j]-v)*u);
  cameras.action.setPosition(...mix(1));cameras.action.lookAt(...mix(2));
  app.renderNextFrame=true;
}
function display(){
  $('time').textContent=`${time.toFixed(1).replace('.',',')} / 19,2 s`;$('timeline').value=String(time);$('play').textContent=playing?'Pauzeren':'Pakken en terugzetten';
  $('status').textContent=browse?'Door de hoezen bladeren':time>=duration?'Terug op dezelfde plek':time>0?frame().phase:records[selected].title;
  $('record').value=String(selected);$('selection').textContent=`${selected+1} / ${records.length} · ${records[selected].title}`;
  for(const id of ['previous','next','record','start-browse'])$(id).disabled=playing||(time>0&&time<duration);
  $('play').disabled=!!browse;
  $('timeline').disabled=!!browse;for(const b of document.querySelectorAll('[data-time]'))b.disabled=!!browse;
  $('diagnostics').textContent=JSON.stringify({renderer:'PlayCanvas',scene:'Current Blender geometry, realtime lighting',meshObjects:root.findComponents('render').length,playing,time:+time.toFixed(4),camera:cameraKey,selected:records[selected].id,browsing:!!browse,angles:angles.map(a=>+a.toFixed(3)),sleevePosition:entities[selected].getPosition().toString(),vinylPosition:vinyl.getPosition().toString(),vinylVisible:vinyl.enabled,ownerOrder:layout.ownerOrder,ownerOrderWritten:false},null,2);
}
function seek(value){time=Math.max(0,Math.min(duration,value));updateScene();display();}
function stop(){playing=false;if(ready)display();}
function choose(index){if(!ready||playing||(time>0&&time<duration))return;time=0;selected=(index+records.length)%records.length;camera('browse');browse={from:[...angles],to:browseAngles(records,selected),started:performance.now()};if(reduced){angles=browse.to;browse=null;route();updateScene();}display();}
$('previous').addEventListener('click',()=>choose(selected-1));$('next').addEventListener('click',()=>choose(selected+1));$('start-browse').addEventListener('click',()=>choose(selected));$('record').addEventListener('change',()=>choose(Number($('record').value)));
document.addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();choose(selected+(e.key==='ArrowRight'?1:-1));}});
$('play').addEventListener('click',()=>{if(!ready||browse)return;if(playing){stop();return;}if(time>=duration-.001){time=0;route();}camera('action');playStarted=performance.now();playFrom=time;playing=true;display();});
$('reset').addEventListener('click',()=>{playing=false;browse=null;angles=records.map(r=>r.angle);route();camera('overview');seek(0);});
$('camera').addEventListener('change',()=>{camera($('camera').value);display();});$('timeline').addEventListener('input',()=>{stop();browse=null;seek(Number($('timeline').value));});
for(const b of document.querySelectorAll('[data-time]'))b.addEventListener('click',()=>{stop();browse=null;camera('action');seek(Number(b.dataset.time));});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{
  const canvas=$('scene'),device=await pc.createGraphicsDevice(canvas,{deviceTypes:['webgl2'],antialias:true,alpha:false});app=new pc.Application(canvas,{graphicsDevice:device});app.setCanvasFillMode(pc.FILLMODE_NONE,canvas.parentElement.clientWidth,canvas.parentElement.clientHeight);app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio,1.5);app.setCanvasResolution(pc.RESOLUTION_AUTO);app.scene.ambientLight=new pc.Color(.14,.13,.12);
  const [asset,hdr,config]=await Promise.all([load('Workshop','container','./assets/record-preview.glb?v=stacks-1'),load('Warehouse light','texture','./assets/lighting.hdr'),fetch('./assets/record-stack-layout.json').then(r=>{if(!r.ok)throw Error('Platenindeling ontbreekt');return r.json();})]);
  layout=config;records=config.records;angles=records.map(r=>r.angle);root=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});app.root.addChild(root);entities=records.map(r=>root.findByName(r.node));if(entities.some(e=>!e))throw Error('Een hoes ontbreekt');vinyl=root.findByName('Playable vinyl / I Dont Want to Calm Down');
  for(const render of root.findComponents('render'))for(const mesh of render.meshInstances){const m=mesh.material;if(m.name==='Revision / dark granular stone wall'){m.diffuse.set(.25,.25,.25);m.update();}if(m.name==='Detail / C3 charcoal candidate'){m.diffuseMap=null;m.diffuse.set(.075,.08,.07);m.update();}}
  for(const c of root.findComponents('camera'))c.enabled=false;cameras={overview:root.findByName('Reference camera / fitted'),action:root.findByName('Record interaction camera'),workbench:root.findByName('Workbench camera / same room'),depth:root.findByName('Depth proof camera')};
  const browseCamera=new pc.Entity('Browse camera');browseCamera.addComponent('camera',{fov:44,nearClip:.02,farClip:100});browseCamera.setPosition(-1.85,1.65,-2.65);browseCamera.lookAt(-3.12,1.32,-3.64);app.root.addChild(browseCamera);cameras.browse=browseCamera;
  for(const e of Object.values(cameras)){e.camera.clearColor=new pc.Color(.16,.17,.18);e.camera.toneMapping=pc.TONEMAP_ACES;}
  const lighting=pc.EnvLighting.generateLightingSource(hdr.resource);app.scene.envAtlas=pc.EnvLighting.generateAtlas(lighting);lighting.destroy();app.scene.skyboxIntensity=.45;
  const sun=new pc.Entity('Daylight');sun.addComponent('light',{type:'directional',intensity:1.25,color:new pc.Color(.94,.97,1),castShadows:true,shadowResolution:2048,shadowDistance:20,shadowType:pc.SHADOW_PCF5});sun.setEulerAngles(35,-130,0);app.root.addChild(sun);
  for(const [name,pos,intensity,color] of [['Ceiling fill',[-1.4,3.25,-4.2],.8,[1,.94,.85]],['Rear fill',[-1.4,3.2,-8.2],.5,[1,.95,.88]],['Cabinet key',[-1.6,2.4,-2.4],.4,[1,.78,.56]]]){const e=new pc.Entity(name);e.addComponent('light',{type:'omni',intensity,color:new pc.Color(...color),range:8,castShadows:false});e.setPosition(...pos);app.root.addChild(e);}
  for(const [i,r] of records.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=r.title;$('record').append(option);}
  const resize=()=>{app.resizeCanvas(canvas.parentElement.clientWidth,canvas.parentElement.clientHeight);app.renderNextFrame=true;};new ResizeObserver(resize).observe(canvas.parentElement);resize();
  app.autoRender=false;
  app.on('update',()=>{if(browse){const t=ease((performance.now()-browse.started)/800);angles=browse.from.map((a,i)=>a+(browse.to[i]-a)*t);if(t>=1){browse=null;route();}updateScene();display();}else if(playing){seek(playFrom+(performance.now()-playStarted)/1000);if(time>=duration)stop();}});
  app.start();ready=true;route();camera('overview');seek(0);$('loading').hidden=true;for(const c of controls)c.disabled=false;if(location.hash==='#browse')choose(0);
}catch(error){$('loading').textContent='De 3D-preview kon niet laden. De ruimtebeelden blijven beschikbaar.';$('status').textContent=String(error?.message||error);console.error(error);}
