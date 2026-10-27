import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {BufferGeometry,BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Matrix4,Raycaster,Vector3} from 'three';
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('public/assets/models/workshop-ready.glb');
const meshes=[];
for(const node of document.getRoot().listNodes()){
  if(!node.getMesh()||!/Shelf|Shelves|WorkBench/i.test(node.getName()))continue;
  for(const primitive of node.getMesh().listPrimitives()){
    const geometry=new BufferGeometry();
    geometry.setAttribute('position',new BufferAttribute(primitive.getAttribute('POSITION').getArray(),3));
    if(primitive.getIndices())geometry.setIndex(new BufferAttribute(primitive.getIndices().getArray(),1));
    const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.name=node.getName();mesh.applyMatrix4(new Matrix4().fromArray(node.getWorldMatrix()));mesh.updateMatrixWorld(true);meshes.push(mesh);
  }
}
for(const x of [-4.8,-4.5,-4.25])for(const z of [-3.8,-3,-2,-1,0]){
  const hits=new Raycaster(new Vector3(x,4,z),new Vector3(0,-1,0)).intersectObjects(meshes);
  console.log(JSON.stringify({x,z,hits:hits.map(h=>({y:+h.point.y.toFixed(3),mesh:h.object.name})).filter((v,i,a)=>i===0||Math.abs(v.y-a[i-1].y)>.005)}));
}
