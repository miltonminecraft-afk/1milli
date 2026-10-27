import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Mat4,Vec3,Quat,BoundingBox} from '../desktop/ui/vendor/playcanvas/playcanvas.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'data/catalog.json'),'utf8'));
for(const asset of catalog.assets.filter(a=>a.model&&a.kind==='room')){
 const file=await fs.readFile(path.join(root,'models',asset.model));if(file.toString('ascii',0,4)!=='glTF')continue;
 const gltf=JSON.parse(file.toString('utf8',20,20+file.readUInt32LE(12)));let box;
 function visit(index,parent){const n=gltf.nodes[index],local=new Mat4();if(n.matrix)local.set(n.matrix);else local.setTRS(new Vec3(...(n.translation||[0,0,0])),new Quat(...(n.rotation||[0,0,0,1])),new Vec3(...(n.scale||[1,1,1])));const world=new Mat4().mul2(parent,local);
  if(n.mesh!=null)for(const p of gltf.meshes[n.mesh].primitives){const a=gltf.accessors[p.attributes.POSITION];if(!a.min||!a.max)continue;const normalize=v=>a.normalized?Math.max(a.componentType===5120||a.componentType===5122?-1:0,v/({5120:127,5121:255,5122:32767,5123:65535}[a.componentType]||1)):v;const localBox=new BoundingBox();localBox.setMinMax(new Vec3(...a.min.map(normalize)),new Vec3(...a.max.map(normalize)));const b=new BoundingBox();b.setFromTransformedAabb(localBox,world);if(box)box.add(b);else box=b;}
  for(const child of n.children||[])visit(child,world);
 }
 for(const node of gltf.scenes[gltf.scene||0].nodes)visit(node,new Mat4());
 const dimensions=box?.halfExtents.clone().mulScalar(2).toArray();
 console.log(JSON.stringify({code:asset.code,title:asset.title,dimensions,modelScale:asset.modelScale,generator:gltf.asset?.generator,extras:gltf.asset?.extras}));
}
