import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from './record-motion.mjs';
// Application controls around the existing PlayCanvas renderer. All room geometry
// comes from the attributed imported asset; no photo displacement or camera zoom.
export async function createRoom(canvas, options={}) {
  const response=await fetch('/assets/room.json');
  const config=response.ok?await response.json():null;
  if(!config?.environment?.url)return null;
  const pc=await import('../vendor/playcanvas.mjs');
  const device=await pc.createGraphicsDevice(canvas,{deviceTypes:['webgl2'],antialias:true,alpha:false});
  const app=new pc.Application(canvas,{graphicsDevice:device});
  app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio,2);app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight=new pc.Color(.045,.05,.055);
  const camera=new pc.Entity('Visitor');camera.addComponent('camera',{fov:60,nearClip:.03,farClip:100,clearColor:new pc.Color(.45,.49,.5),toneMapping:pc.TONEMAP_ACES});app.root.addChild(camera);
  const light=new pc.Entity('Window daylight');light.addComponent('light',{type:'directional',intensity:.55,color:new pc.Color(1,.97,.92),castShadows:true,shadowResolution:2048,shadowDistance:20,shadowType:pc.SHADOW_PCF5});light.setEulerAngles(45,-60,0);app.root.addChild(light);
  for(const item of config.lights||[]){const lamp=new pc.Entity(item.name);lamp.setPosition(...item.position);lamp.addComponent('light',{type:'omni',color:new pc.Color(...item.color),intensity:item.intensity,range:item.range,castShadows:true,shadowResolution:1024});app.root.addChild(lamp);}
  let alive=true,motion=true,navigation=false,target=null;
  const textures=new Map(),containers=new Map(),models=new Map(),records=new Map(),keys=new Set();
  const pos=new pc.Vec3(...config.views.overview.position),look=new pc.Vec3(...config.views.overview.target);
  camera.setPosition(pos);camera.lookAt(look);
  function load(name,type,url,filename){return new Promise((resolve,reject)=>{const a=new pc.Asset(name,type,{url,filename});app.assets.add(a);a.once('load',()=>resolve(a));a.once('error',reject);app.assets.load(a);});}
  function transform(e,t={}){e.setPosition(t.x??0,t.y??0,t.z??0);e.setEulerAngles(t.rx??0,t.ry??0,t.rz??0);const s=t.scale??1;e.setLocalScale(s,s,s);}
  function texture(url){if(!textures.has(url))textures.set(url,load(url,'texture',url).then(a=>a.resource));return textures.get(url);}
  function container(url,name){if(!containers.has(url))containers.set(url,load(name,'container',url,'model.glb'));return containers.get(url);}
  try{
    const hdr=await texture('/assets/warehouse-lighting.hdr');
    const lighting=pc.EnvLighting.generateLightingSource(hdr);
    app.scene.envAtlas=pc.EnvLighting.generateAtlas(lighting);lighting.destroy();
    app.scene.skybox=pc.EnvLighting.generateSkyboxCubemap(hdr);
    app.scene.skyboxIntensity=.5;
    app.scene.layers.getLayerById(pc.LAYERID_SKYBOX).enabled=false;
    const splat=config.environment.type==='gsplat';
    const a=await load('Workshop',splat?'gsplat':'container',config.environment.url,splat?'room.ply':'room.glb');
    const room=new pc.Entity('Workshop');
    if(splat)room.addComponent('gsplat',{asset:a,unified:true});
    else {
      const content=a.resource.instantiateRenderEntity();room.addChild(content);
    }
    transform(room,config.environment.transform);app.root.addChild(room);
  }catch(error){app.destroy();throw error;}
  function setView(name){const v=config.views[name]||config.views.overview;target={position:new pc.Vec3(...v.position),look:new pc.Vec3(...v.target)};}
  let pendingItems=null,processing=false,currentDeck=null,recordItems=[],animation=null;
  function face(points,normal,material){
    const mesh=new pc.Mesh(device);mesh.setPositions(points);mesh.setNormals([...normal,...normal,...normal,...normal]);mesh.setUvs(0,[0,1,1,1,1,0,0,0]);mesh.setIndices([0,1,2,0,2,3]);mesh.update(pc.PRIMITIVE_TRIANGLES);
    return new pc.MeshInstance(mesh,material);
  }
  function paper(map,color=[1,1,1]){const m=new pc.StandardMaterial();m.diffuse=new pc.Color(...color);m.diffuseMap=map;m.gloss=8;m.metalness=0;m.useMetalness=true;m.cull=pc.CULLFACE_NONE;m.update();return m;}
  function makeSleeve(item,cover){
    // Thick gatefold spine; separate front/back leave a real opening on the right.
    const front=paper(cover),edge=paper(null,[.16,.15,.13]);
    const label=document.createElement('canvas');label.width=128;label.height=2048;
    const ctx=label.getContext('2d');ctx.fillStyle='#e5dec9';ctx.fillRect(0,0,128,2048);
    ctx.translate(64,1024);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#252820';
    ctx.font='700 84px Arial';ctx.fillText(item.title,0,0,1780);
    const spineTexture=new pc.Texture(device,{mipmaps:true,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR});spineTexture.setSource(label);
    const spine=paper(spineTexture),d=.027;
    const e=new pc.Entity(item.title);e.addComponent('render',{castShadows:true,receiveShadows:true,meshInstances:[
      face([-.5,-.5,d,.5,-.5,d,.5,.5,d,-.5,.5,d],[0,0,1],front),
      face([.5,-.5,-d,-.5,-.5,-d,-.5,.5,-d,.5,.5,-d],[0,0,-1],front),
      face([-.5,-.5,-d,-.5,-.5,d,-.5,.5,d,-.5,.5,-d],[-1,0,0],spine),
      face([-.5,.5,d,.5,.5,d,.5,.5,-d,-.5,.5,-d],[0,1,0],edge),
      face([-.5,-.5,-d,.5,-.5,-d,.5,-.5,d,-.5,-.5,d],[0,-1,0],edge)
    ]});app.root.addChild(e);return e;
  }
  function updateLabel(item){
    const vinyl=models.get('base-vinyl')?.entity,cover=textures.get(item.coverUrl);
    return Promise.resolve(cover).then(tex=>{if(!alive||!vinyl)return;for(const c of vinyl.findComponents('render'))for(const mesh of c.meshInstances){
      if(mesh.material.name==='Release label'){mesh.material.diffuseMap=tex;mesh.material.diffuse.set(1,1,1);mesh.material.update();}
    }});
  }
  function placeRecords(items){
    for(const item of items){const e=records.get(item.id),anchor=item.id===currentDeck?config.anchors.sleeveAtDeck:config.anchors.records[item.slot];e.enabled=!!anchor;if(anchor)transform(e,anchor);}
    const vinyl=models.get('base-vinyl');if(vinyl?.entity){vinyl.entity.enabled=!!currentDeck;transform(vinyl.entity,vinyl.item.transform);}
  }
  function animateRecord(item,returning){
    const frames=recordTimeline({shelf:config.anchors.records[item.slot],sleeveAtDeck:config.anchors.sleeveAtDeck,platter:models.get('base-vinyl').item.transform});
    setView('recordAction');keys.clear();
    if(!motion)return Promise.resolve();
    return new Promise(resolve=>{animation={frames,item,returning,time:0,resolve,phase:''};});
  }
  async function setRecords(items){
    pendingItems=items;if(processing)return;processing=true;
    try{while(pendingItems&&alive){
      const next=pendingItems;pendingItems=null;
      for(const item of next)if(!records.has(item.id)){const tex=await texture(item.coverUrl);if(!alive)return;const sleeve=makeSleeve(item,tex),anchor=config.anchors.records[item.slot];sleeve.enabled=!!anchor;if(anchor)transform(sleeve,anchor);records.set(item.id,sleeve);}
      const wanted=next.find(item=>item.location==='turntable')?.id||null;
      if(wanted!==currentDeck){
        options.onTransition?.('Hoes pakken');
        if(currentDeck){const old=recordItems.find(item=>item.id===currentDeck);if(old)await animateRecord(old,true);if(!alive)return;currentDeck=null;placeRecords(next);}
        const selected=next.find(item=>item.id===wanted);
        if(selected){await updateLabel(selected);await animateRecord(selected,false);if(!alive)return;currentDeck=selected.id;}
        placeRecords(next);setView(wanted?'turntable':'records');options.onTransition?.(null);
      }else placeRecords(next);
      recordItems=next;
    }}finally{processing=false;}
  }
  async function addModel(item){
    if(models.has(item.id)){const m=models.get(item.id);m.item=item;if(m.entity)transform(m.entity,item.transform);return;}
    const m={item,entity:null};models.set(item.id,m);
    try{const a=await container(item.url,item.name);if(!alive)return;m.entity=new pc.Entity(item.name);m.entity.addChild(a.resource.instantiateRenderEntity());app.root.addChild(m.entity);transform(m.entity,m.item.transform);if(item.id==='base-vinyl')m.entity.enabled=false;}
    catch{models.delete(item.id);options.onError?.(`Het object ${item.name} kon niet worden geladen.`);}
  }
  await Promise.all((config.props||[]).map(addModel));
  function keydown(e){if(!navigation||animation||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys.add(e.code);e.preventDefault();target=null;}}
  const keyup=e=>keys.delete(e.code),blur=()=>keys.clear();let pointer=null,pressStart=null;
  function down(e){if(!navigation||animation)return;pointer=[e.clientX,e.clientY];pressStart=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);target=null;}
  function up(e){
    if(pressStart&&e.type==='pointerup'&&Math.hypot(e.clientX-pressStart[0],e.clientY-pressStart[1])<6){
      const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
      const origin=camera.camera.screenToWorld(x,y,camera.camera.nearClip),end=camera.camera.screenToWorld(x,y,camera.camera.farClip);
      const ray=new pc.Ray(origin,end.sub(origin).normalize()),hit=new pc.Vec3();let nearest=null,distance=Infinity;
      for(const [id,entity] of records){
        if(entity.enabled)for(const mesh of entity.render.meshInstances)if(mesh.aabb.intersectsRay(ray,hit)){const d=hit.distance(origin);if(d<distance){distance=d;nearest=id;}}
      }
      if(nearest)options.onRecord?.(nearest);
    }
    pointer=null;pressStart=null;
  }
  function move(e){if(!pointer)return;const a=camera.getEulerAngles();camera.setEulerAngles(Math.max(-75,Math.min(75,a.x-(e.clientY-pointer[1])*.16)),a.y-(e.clientX-pointer[0])*.16,0);look.copy(pos).add(camera.forward.clone().mulScalar(4));pointer=[e.clientX,e.clientY];}
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  const resize=()=>{const r=canvas.parentElement.getBoundingClientRect();app.resizeCanvas(r.width,r.height);};const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  app.on('update',dt=>{
    dt=Math.min(dt,.05);
    if(animation){
      const a=animation;a.time=motion?a.time+dt:RECORD_DURATION;
      const frame=sampleRecordTimeline(a.frames,a.time,a.returning),vinyl=models.get('base-vinyl').entity;
      transform(records.get(a.item.id),frame.sleeve);transform(vinyl,frame.vinyl);vinyl.enabled=frame.visible;
      if(a.phase!==frame.phase){a.phase=frame.phase;options.onTransition?.(frame.phase);}
      if(a.time>=RECORD_DURATION){animation=null;a.resolve();}
    }
    if(target){const t=motion?1-Math.exp(-dt*4):1;pos.lerp(pos,target.position,t);look.lerp(look,target.look,t);}
    if(keys.size){
      const f=camera.forward.clone();f.y=0;f.normalize();const r=camera.right.clone();r.y=0;r.normalize();const step=new pc.Vec3();
      if(keys.has('KeyW')||keys.has('ArrowUp'))step.add(f);if(keys.has('KeyS')||keys.has('ArrowDown'))step.sub(f);
      if(keys.has('KeyD')||keys.has('ArrowRight'))step.add(r);if(keys.has('KeyA')||keys.has('ArrowLeft'))step.sub(r);
      const next=pos.clone().add(step.normalize().mulScalar(dt*1.8)),b=config.walkBounds;
      if(b){next.x=Math.max(b.min[0],Math.min(b.max[0],next.x));next.z=Math.max(b.min[1],Math.min(b.max[1],next.z));}
      const blocked=(x,z)=>(config.obstacles||[]).some(o=>x>o.min[0]-.18&&x<o.max[0]+.18&&z>o.min[1]-.18&&z<o.max[1]+.18);
      if(blocked(next.x,pos.z))next.x=pos.x;
      if(blocked(next.x,next.z))next.z=pos.z;
      look.add(next.clone().sub(pos));pos.copy(next);
    }
    camera.setPosition(pos);camera.lookAt(look);
  });app.start();
  return {setView,setRecords,addModel,setMotion(v){motion=v;},setNavigation(v){navigation=v;if(!v)keys.clear();},destroy(){alive=false;animation?.resolve();animation=null;observer.disconnect();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);app.destroy();}};
}
