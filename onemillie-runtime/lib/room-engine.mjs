// PlayCanvas runtime reused from the user's existing splat viewer.
// Application glue only: camera choreography, inferred-depth photo and album anchors.
export async function createRoom(canvas, options = {}) {
  const pc = await import('../vendor/playcanvas.mjs');
  const device = await pc.createGraphicsDevice(canvas, {deviceTypes:['webgl2'],antialias:true,alpha:true,powerPreference:'low-power'});
  const app = new pc.Application(canvas,{graphicsDevice:device});
  app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio,2);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  const camera = new pc.Entity('Workshop camera');
  camera.addComponent('camera',{fov:53,nearClip:.03,farClip:100,clearColor:new pc.Color(.08,.08,.06,0)});
  app.root.addChild(camera);
  app.scene.ambientLight = new pc.Color(.8,.8,.75);
  const fill = new pc.Entity('Window light');fill.addComponent('light',{type:'directional',color:new pc.Color(1,.91,.77),intensity:1.5});fill.setEulerAngles(40,-45,0);app.root.addChild(fill);
  const W=1672,H=941,ratio=W/H,tan=Math.tan(55*Math.PI/360);
  let depth=null,alive=true,currentView='overview',motion=true,albumNodes=[],disc=null;
  const textures=new Map(),models=new Map();
  const p=new pc.Vec3(),look=new pc.Vec3(0,0,-7),targetP=new pc.Vec3(),targetLook=new pc.Vec3(0,0,-7);
  let desiredFov=53,currentFov=53,elapsed=0,travel=0;
  async function texture(url){
    if(textures.has(url))return textures.get(url);
    const asset=new pc.Asset(url,'texture',{url});app.assets.add(asset);
    const result=await new Promise((resolve,reject)=>{asset.once('load',()=>resolve(asset.resource));asset.once('error',reject);app.assets.load(asset);});
    if(!alive){asset.unload();return null;}textures.set(url,result);return result;
  }
  function distanceAt(x,y){
    if(!depth)return 7;
    const xx=Math.max(0,Math.min(depth.width-1,Math.round(x/W*(depth.width-1))));
    const yy=Math.max(0,Math.min(depth.height-1,Math.round(y/H*(depth.height-1))));
    const v=depth.values[yy*depth.width+xx];
    return 4.2+7.8*Math.pow(1-Math.min(1,Math.max(0,v)),1.25);
  }
  function point(x,y,d=distanceAt(x,y)){return [(x/W-.5)*2*tan*ratio*d,(.5-y/H)*2*tan*d,-d];}
  function meshEntity(name,positions,uvs,indices,tex,opacity=1){
    const mesh=new pc.Mesh(device);mesh.setPositions(positions);mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
    const mat=new pc.StandardMaterial();mat.useLighting=false;mat.emissiveMap=tex;mat.emissive=new pc.Color(opacity,opacity,opacity);mat.emissiveTint=true;mat.diffuse=new pc.Color(0,0,0);mat.cull=pc.CULLFACE_NONE;mat.blendType=pc.BLEND_NONE;mat.update();
    const entity=new pc.Entity(name);entity.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,mat)]});app.root.addChild(entity);return entity;
  }
  function quad(name,corners,tex,brightness=1){
    const cx=corners.reduce((a,b)=>a+b[0],0)/4,cy=corners.reduce((a,b)=>a+b[1],0)/4;
    const d=distanceAt(cx,cy)-.025;
    return meshEntity(name,corners.flatMap(([x,y])=>point(x,y,d)),[0,0,1,0,1,1,0,1],[0,2,1,0,3,2],tex,brightness);
  }
  const depthPromise=fetch('/assets/workshop-depth.json').then(r=>r.ok?r.json():null).catch(()=>null);
  const photo=await texture('/assets/workshop.png');depth=await depthPromise;
  if(!alive)return;
  const nx=depth?192:1,ny=depth?108:1,positions=[],uvs=[],indices=[];
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){positions.push(...point(x/nx*W,y/ny*H));uvs.push(x/nx,y/ny);}
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const photoMesh=meshEntity('Depth Anything V2 photo surface',positions,uvs,indices,photo);
  const albumCorners=[[[171,350],[239,357],[247,458],[181,453]],[[311,363],[395,372],[405,467],[319,460]]];
  function setView(view){
    currentView=view;travel=1;
    if(view==='records'){const q=point(280,430);targetP.set(-.52,.04,-.85);targetLook.set(q[0]*.75,q[1],q[2]);desiredFov=39;}
    else if(view==='turntable'){const q=point(669,555);targetP.set(-.08,-.035,-.72);targetLook.set(q[0],q[1],q[2]);desiredFov=43;}
    else if(view==='projects'){const q=point(1435,520);targetP.set(.4,.02,-.65);targetLook.set(q[0]*.75,q[1],q[2]);desiredFov=44;}
    else{targetP.set(0,0,0);targetLook.set(0,0,-7);desiredFov=53;}
  }
  let albumGeneration=0;
  async function setAlbums(urls){
    const generation=++albumGeneration;
    const images=await Promise.all(urls.slice(0,2).map(texture));if(!alive||generation!==albumGeneration)return;
    albumNodes.forEach(n=>n.destroy());albumNodes=images.map((t,i)=>quad('Album sleeve '+i,albumCorners[i],t,.7));
  }
  async function setRecord(url){
    disc?.destroy();disc=null;if(!url)return;
    const label=await texture(url);if(!alive)return;
    // Calibrated to the visible platter, not the front edge of the turntable.
    disc=quad('Vinyl label',[[661,549.5],[680,549.5],[680,555.5],[661,555.5]],label,.65);
  }
  async function addModel(item){
    if(models.has(item.id)){const e=models.get(item.id);applyTransform(e,item);return;}
    const asset=new pc.Asset(item.name||item.id,'container',{url:item.url,filename:'model.glb'});
    app.assets.add(asset);asset.once('load',()=>{if(!alive)return;const entity=asset.resource.instantiateRenderEntity();app.root.addChild(entity);models.set(item.id,entity);applyTransform(entity,item);});app.assets.load(asset);
  }
  function applyTransform(e,item){const t=item.transform||{};const base=point(1365,560);e.setPosition(t.x??base[0],t.y??base[1],t.z??base[2]+.4);e.setEulerAngles(t.rx??0,t.ry??0,t.rz??0);const s=t.scale??.2;e.setLocalScale(s,s,s);}
  let pointer={x:0,y:0};
  const onPointer=e=>{pointer={x:e.clientX/window.innerWidth-.5,y:e.clientY/window.innerHeight-.5};};
  window.addEventListener('pointermove',onPointer,{passive:true});
  const resize=()=>{const box=canvas.parentElement.getBoundingClientRect();app.resizeCanvas(box.width,box.height);};
  const observer=new ResizeObserver(resize);observer.observe(canvas.parentElement);resize();
  app.on('update',dt=>{
    elapsed+=Math.min(dt,.1);travel=Math.max(0,travel-dt*.7);
    const blend=motion?1-Math.exp(-Math.min(dt,.1)*3.2):1;
    p.lerp(p,targetP,blend);look.lerp(look,targetLook,blend);currentFov+=(desiredFov-currentFov)*blend;
    const bob=motion&&travel>0?Math.sin(elapsed*7)*.008*Math.sin(travel*Math.PI):0;
    camera.setPosition(p.x+(motion?pointer.x*.018:0),p.y+bob+(motion?-pointer.y*.01:0),p.z);
    camera.lookAt(look);const aspect=canvas.clientWidth/canvas.clientHeight;
    camera.camera.fov=aspect>ratio?2*Math.atan(Math.tan(currentFov*Math.PI/360)*ratio/aspect)*180/Math.PI:currentFov;
  });
  app.start();options.onReady?.({hasDepth:!!depth,engine:'PlayCanvas 2.23'});
  return {setView,setAlbums,setRecord,addModel,setMotion(value){motion=value;},destroy(){alive=false;observer.disconnect();window.removeEventListener('pointermove',onPointer);app.destroy();}};
}
