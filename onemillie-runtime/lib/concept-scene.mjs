import {FRAME,photoPoint,shelfDepth,recordAnchor,recordBrowseAngle,SLEEVE_HALF_DEPTH,PLATTER,SLEEVE_AT_DECK,CONCEPT_VIEWS,OBJECT_HOTSPOTS} from './concept-layout.mjs';
import {recordTimeline,sampleRecordTimeline,RECORD_DURATION} from './record-motion.mjs';
import {publicPath} from './public-path.mjs';

// Reuse PlayCanvas and the existing Depth Anything map. The photo surface is a
// bounded-view stage, not a generated 360° scan. Records and imported GLBs are 3D.
export async function createRoom(canvas,options={}){
  const pc=await import('../vendor/playcanvas.mjs');
  const device=await pc.createGraphicsDevice(canvas,{deviceTypes:['webgl2'],antialias:true,alpha:false});
  const app=new pc.Application(canvas,{graphicsDevice:device});
  app.graphicsDevice.maxPixelRatio=Math.min(devicePixelRatio,2);app.setCanvasFillMode(pc.FILLMODE_NONE);app.setCanvasResolution(pc.RESOLUTION_AUTO);
  const camera=new pc.Entity('Concept camera');camera.addComponent('camera',{fov:55,nearClip:.02,farClip:40,clearColor:new pc.Color(.07,.075,.06)});app.root.addChild(camera);
  app.scene.ambientLight=new pc.Color(.42,.39,.33);
  const light=new pc.Entity('Warm workshop light');light.addComponent('light',{type:'directional',color:new pc.Color(1,.84,.62),intensity:1.5});light.setEulerAngles(40,-30,0);app.root.addChild(light);
  const fill=new pc.Entity('Cool ceiling light');fill.addComponent('light',{type:'directional',color:new pc.Color(.8,.9,1),intensity:.5});fill.setEulerAngles(15,160,0);app.root.addChild(fill);
  const textures=new Map(),containers=new Map(),records=new Map(),models=new Map();
  let alive=true,motion=true,currentDeck=null,recordItems=[],pending=null,processing=false,animation=null,wantedModels=new Set();
  let view='overview',pressed=null,desired=CONCEPT_VIEWS.overview,stage,benchStage,activeRecord=null,browsing=null;
  const position=new pc.Vec3(...desired.position),look=new pc.Vec3(...photoPoint(...desired.pixel,desired.depth));let fov=desired.fov;
  function load(name,type,url,filename){return new Promise((resolve,reject)=>{const a=new pc.Asset(name,type,{url:publicPath(url),filename});app.assets.add(a);a.once('load',()=>resolve(a));a.once('error',reject);app.assets.load(a);});}
  function texture(url){if(!textures.has(url))textures.set(url,load(url,'texture',url).then(a=>a.resource));return textures.get(url);}
  function container(url){if(!containers.has(url))containers.set(url,load(url,'container',url,'model.glb'));return containers.get(url);}
  function transform(e,t){e.setPosition(t.x??0,t.y??0,t.z??0);e.setEulerAngles(t.rx??0,t.ry??0,t.rz??0);const s=t.scale??1;e.setLocalScale(s,s,s);}
  function material(map,color=[1,1,1],unlit=false){const m=new pc.StandardMaterial();m.diffuse=new pc.Color(...color);m.diffuseMap=map;m.useMetalness=true;m.metalness=0;m.gloss=8;m.cull=pc.CULLFACE_NONE;if(unlit){m.useLighting=false;m.diffuseMap=null;m.diffuse.set(0,0,0);m.emissiveMap=map;m.emissive.set(...color);}m.update();return m;}
  function face(points,normal,mat){const mesh=new pc.Mesh(device);mesh.setPositions(points);mesh.setNormals([...normal,...normal,...normal,...normal]);mesh.setUvs(0,[0,1,1,1,1,0,0,0]);mesh.setIndices([0,1,2,0,2,3]);mesh.update(pc.PRIMITIVE_TRIANGLES);return new pc.MeshInstance(mesh,mat);}
  try{
    const [photo,depth,benchPhoto]=await Promise.all([texture('/assets/workshop-soldering-v3.png'),fetch(publicPath('/assets/workshop-depth.json')).then(r=>r.json()),texture('/assets/workbench-soldering-v2.png')]);
    if(!alive)return;
    function distance(x,y){
      if(x<438)return shelfDepth(x)+.09;
      const ix=Math.max(0,Math.min(depth.width-1,Math.round(x/FRAME.width*(depth.width-1))));
      const iy=Math.max(0,Math.min(depth.height-1,Math.round(y/FRAME.height*(depth.height-1))));
      let d=2.5+5.5*Math.pow(1-Math.max(0,Math.min(1,depth.values[iy*depth.width+ix])),1.25);
      // Blend whole furniture surfaces; a hard depth step at the platter creates
      // stretched strips when the camera translates toward it.
      const table=Math.max(0,Math.min(1,(x-430)/55,(980-x)/65,(y-445)/65,(830-y)/80));
      d=d*(1-table)+2.68*table;
      const shelf=Math.max(0,Math.min(1,(490-x)/52));
      d=d*(1-shelf)+(shelfDepth(x)+.09)*shelf;
      return d;
    }
    const positions=[],uvs=[],indices=[],nx=240,ny=135;
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const px=x/nx*FRAME.width,py=y/ny*FRAME.height;positions.push(...photoPoint(px,py,distance(px,py)));uvs.push(x/nx,y/ny);}
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const mesh=new pc.Mesh(device);mesh.setPositions(positions);mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
    stage=new pc.Entity('Approved concept with depth');stage.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material(photo,[1,1,1],true))]});app.root.addChild(stage);
    // The second concept plate is projected from its calibrated workbench camera.
    // Imported objects keep their world coordinates in both views.
    const v=CONCEPT_VIEWS.workbenches,eye=new pc.Vec3(...v.position),forward=new pc.Vec3(...photoPoint(...v.pixel,v.depth)).sub(eye).normalize();
    const right=new pc.Vec3().cross(forward,pc.Vec3.UP).normalize(),up=new pc.Vec3().cross(right,forward),tan=Math.tan(v.fov*Math.PI/360),bp=[],bu=[],bi=[];
    for(let y=0;y<=30;y++)for(let x=0;x<=50;x++){
      const d=y<16?5.1:5.1-(y-16)/14*1.2;
      const p=eye.clone().add(forward.clone().mulScalar(d)).add(right.clone().mulScalar((x/50-.5)*2*tan*FRAME.width/FRAME.height*d)).add(up.clone().mulScalar((.5-y/30)*2*tan*d));bp.push(p.x,p.y,p.z);bu.push(x/50,y/30);
    }
    for(let y=0;y<30;y++)for(let x=0;x<50;x++){const a=y*51+x;bi.push(a,a+51,a+1,a+1,a+51,a+52);}
    const bm=new pc.Mesh(device);bm.setPositions(bp);bm.setUvs(0,bu);bm.setIndices(bi);bm.update(pc.PRIMITIVE_TRIANGLES);
    benchStage=new pc.Entity('Workbench concept view');benchStage.addComponent('render',{meshInstances:[new pc.MeshInstance(bm,material(benchPhoto,[1,1,1],true))]});benchStage.enabled=false;app.root.addChild(benchStage);
  }catch(e){app.destroy();throw e;}
  function makeSleeve(item,cover){
    const front=material(cover,[.66,.62,.56]),edge=material(null,[.18,.15,.11]);
    const label=document.createElement('canvas');label.width=128;label.height=2048;const ctx=label.getContext('2d');ctx.fillStyle='#d8ceb2';ctx.fillRect(0,0,128,2048);ctx.translate(64,1024);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#25251f';ctx.font='700 84px Arial';ctx.fillText(item.title,0,0,1800);
    const spineTexture=new pc.Texture(device,{mipmaps:true});spineTexture.setSource(label);const spine=material(spineTexture,[.8,.77,.7]),d=SLEEVE_HALF_DEPTH;
    const e=new pc.Entity(item.title);e.addComponent('render',{meshInstances:[
      face([-.5,-.5,d,.5,-.5,d,.5,.5,d,-.5,.5,d],[0,0,1],front),face([.5,-.5,-d,-.5,-.5,-d,-.5,.5,-d,.5,.5,-d],[0,0,-1],front),
      face([-.5,-.5,-d,-.5,-.5,d,-.5,.5,d,-.5,.5,-d],[-1,0,0],spine),face([-.5,.5,d,.5,.5,d,.5,.5,-d,-.5,.5,-d],[0,1,0],edge),
      face([-.5,-.5,-d,.5,-.5,-d,.5,-.5,d,-.5,-.5,d],[0,-1,0],edge)
    ]});e.enabled=false;app.root.addChild(e);return e;
  }
  const vinylAsset=await container('/assets/models/vinyl-record-ready.glb');
  const vinyl=new pc.Entity('Playable vinyl');vinyl.addChild(vinylAsset.resource.instantiateRenderEntity());app.root.addChild(vinyl);vinyl.enabled=false;
  const atBench=()=>view==='workbenches'||view==='projects';
  function sleeveHome(item){const selected=recordItems.find(r=>r.id===activeRecord);return recordAnchor(item.slot,recordBrowseAngle(item.slot,view==='records'?selected?.slot??-1:-1));}
  function readPose(e){const p=e.getPosition(),r=e.getEulerAngles();return {x:p.x,y:p.y,z:p.z,rx:r.x,ry:r.y,rz:r.z,scale:e.getLocalScale().x};}
  function browseToSelection(){if(animation||processing)return;const poses=recordItems.filter(r=>r.id!==currentDeck).map(r=>({entity:records.get(r.id),from:readPose(records.get(r.id)),to:sleeveHome(r)}));if(!motion){for(const p of poses)transform(p.entity,p.to);browsing=null;}else browsing={started:performance.now(),poses};}
  function setActiveRecord(id){if(activeRecord===id)return;activeRecord=id;if(view==='records')browseToSelection();}
  function setView(name){const before=atBench();view=name in CONCEPT_VIEWS?name:'overview';desired=CONCEPT_VIEWS[view];stage.enabled=!atBench();benchStage.enabled=atBench();for(const e of records.values())e.enabled=!atBench();vinyl.enabled=!!currentDeck&&!atBench();if(before!==atBench()){position.set(...desired.position);look.set(...photoPoint(...desired.pixel,desired.depth));fov=desired.fov;}if(view!=='recordAction')browseToSelection();}
  function placeRecords(items){for(const item of items){const e=records.get(item.id);e.enabled=!atBench();transform(e,item.id===currentDeck?SLEEVE_AT_DECK:sleeveHome(item));}vinyl.enabled=!!currentDeck&&!atBench();transform(vinyl,PLATTER);}
  async function updateLabel(item){const tex=await texture(item.coverUrl);for(const c of vinyl.findComponents('render'))for(const mesh of c.meshInstances)if(mesh.material.name==='Release label'){mesh.material.diffuseMap=tex;mesh.material.update();}}
  function animateRecord(item,returning){
    if(browsing){for(const p of browsing.poses)transform(p.entity,p.to);browsing=null;}
    const home=returning?recordAnchor(item.slot,recordBrowseAngle(item.slot,recordItems.find(r=>r.id===activeRecord)?.slot??-1)):readPose(records.get(item.id));
    const pulled={...home,y:home.y+.045,z:home.z+.36,rx:0,ry:-5,rz:0};
    const frames=recordTimeline({shelf:home,sleeveAtDeck:SLEEVE_AT_DECK,platter:PLATTER,waypoints:{pulled}});setView('recordAction');
    if(!motion)return Promise.resolve();return new Promise(resolve=>{animation={frames,item,returning,time:0,started:performance.now(),resolve,phase:''};});
  }
  async function setRecords(items){
    pending=items;if(processing)return;processing=true;
    try{while(pending&&alive){const next=pending;pending=null;
      for(const item of next)if(!records.has(item.id)){const tex=await texture(item.coverUrl);if(!alive)return;const e=makeSleeve(item,tex);transform(e,recordAnchor(item.slot));e.enabled=true;records.set(item.id,e);}
      const wanted=next.find(i=>i.location==='turntable')?.id||null;
      if(wanted!==currentDeck){options.onTransition?.('Hoes pakken');
        if(currentDeck){const old=recordItems.find(i=>i.id===currentDeck);if(old)await animateRecord(old,true);if(!alive)return;currentDeck=null;placeRecords(next);}
        const selected=next.find(i=>i.id===wanted);if(selected){await updateLabel(selected);await animateRecord(selected,false);if(!alive)return;currentDeck=selected.id;}
        placeRecords(next);setView(wanted?'turntable':'records');options.onTransition?.(null);
      }else placeRecords(next);recordItems=next;
    }}finally{processing=false;browseToSelection();}
  }
  async function addModel(item){
    if(models.has(item.id)){const m=models.get(item.id);m.item=item;if(m.entity)transform(m.entity,item.transform);return;}
    const m={item,entity:null};models.set(item.id,m);
    try{const a=await container(item.url);if(!alive||!wantedModels.has(item.id))return;
      const e=new pc.Entity(item.name),content=a.resource.instantiateRenderEntity();e.addChild(content);app.root.addChild(e);
      let box;for(const r of content.findComponents('render'))for(const mesh of r.meshInstances){if(box)box.add(mesh.aabb);else box=mesh.aabb.clone();}
      if(box){const factor=.45/Math.max(box.halfExtents.x*2,box.halfExtents.y*2,box.halfExtents.z*2,.001);content.setLocalScale(factor,factor,factor);content.setLocalPosition(-box.center.x*factor,-box.getMin().y*factor,-box.center.z*factor);}
      m.entity=e;transform(e,m.item.transform);
    }catch{models.delete(item.id);options.onError?.(`Het object ${item.name} kon niet worden geladen.`);}
  }
  function setModels(items){wantedModels=new Set(items.map(i=>i.id));for(const [id,m] of models)if(!wantedModels.has(id)){m.entity?.destroy();models.delete(id);}return Promise.all(items.map(addModel));}
  function down(e){pressed=[e.clientX,e.clientY];}
  function up(e){if(animation||!pressed)return;const start=pressed;pressed=null;if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;
    const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
    const origin=camera.camera.screenToWorld(x,y,camera.camera.nearClip),end=camera.camera.screenToWorld(x,y,camera.camera.farClip),ray=new pc.Ray(origin,end.sub(origin).normalize()),hit=new pc.Vec3();let nearest=null,distance=Infinity;
    for(const [id,e] of records)if(e.enabled)for(const mesh of e.render.meshInstances)if(mesh.aabb.intersectsRay(ray,hit)){const d=hit.distance(origin);if(d<distance){nearest=id;distance=d;}}
    if(nearest)options.onRecord?.(nearest);
  }
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);
  const resize=()=>{const r=canvas.parentElement.getBoundingClientRect();app.resizeCanvas(r.width,r.height);};const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  app.on('update',delta=>{
    const dt=Math.min(delta,.05),blend=motion?1-Math.exp(-dt*4):1;
    if(browsing&&!animation){const b=browsing,u=motion?Math.min(1,(performance.now()-b.started)/750):1,t=u*u*(3-2*u);for(const p of b.poses){const pose={};for(const key of Object.keys(p.to)){let delta=p.to[key]-p.from[key];if(key[0]==='r')delta=((delta+540)%360)-180;pose[key]=p.from[key]+delta*t;}transform(p.entity,pose);}if(u>=1)browsing=null;}
    if(animation){const a=animation;a.time=motion?(performance.now()-a.started)/1000:RECORD_DURATION;const frame=sampleRecordTimeline(a.frames,a.time,a.returning);transform(records.get(a.item.id),frame.sleeve);transform(vinyl,frame.vinyl);vinyl.enabled=frame.visible;if(a.phase!==frame.phase){a.phase=frame.phase;options.onTransition?.(frame.phase);}if(a.time>=RECORD_DURATION){animation=null;a.resolve();}}
    position.lerp(position,new pc.Vec3(...desired.position),blend);look.lerp(look,new pc.Vec3(...photoPoint(...desired.pixel,desired.depth)),blend);fov+=(desired.fov-fov)*blend;
    camera.setPosition(position.x,position.y,position.z);camera.lookAt(look);
    // On portrait screens retain the horizontal composition of each calibrated view.
    const aspect=canvas.clientWidth/canvas.clientHeight,base=FRAME.width/FRAME.height;
    camera.camera.fov=aspect<base?2*Math.atan(Math.tan(fov*Math.PI/360)*base/aspect)*180/Math.PI:fov;
    if(view==='overview'&&options.onHotspots){
      const points=Object.fromEntries(Object.entries(OBJECT_HOTSPOTS).map(([name,point])=>{
        const screen=camera.camera.worldToScreen(new pc.Vec3(...point));
        return [name,{x:screen.x,y:screen.y}];
      }));
      options.onHotspots(points);
    }
  });app.start();
  return {setView,setRecords,setModels,setActiveRecord,setMotion(v){motion=v;},setNavigation(){},destroy(){alive=false;animation?.resolve();animation=null;browsing=null;observer.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);app.destroy();}};
}
