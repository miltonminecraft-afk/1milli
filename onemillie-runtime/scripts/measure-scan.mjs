import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {BufferGeometry,BufferAttribute,Mesh,MeshBasicMaterial,DoubleSide,Matrix4,Raycaster,Vector3} from 'three';
const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('../onemillie/research/building-scan-source.glb');
const meshes=[];
const transform=new Matrix4().makeScale(.05,.05,.05);
for(const node of document.getRoot().listNodes()){
  if(!node.getMesh())continue;
  for(const primitive of node.getMesh().listPrimitives()){
    const geometry=new BufferGeometry();
    geometry.setAttribute('position',new BufferAttribute(primitive.getAttribute('POSITION').getArray(),3));
    if(primitive.getIndices())geometry.setIndex(new BufferAttribute(primitive.getIndices().getArray(),1));
    const mesh=new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));mesh.name=node.getName();mesh.applyMatrix4(new Matrix4().fromArray(node.getWorldMatrix()).premultiply(transform));mesh.updateMatrixWorld(true);meshes.push(mesh);
  }
}
for(const z of [-4,-3,-2,-1,0,1,2,3,4]){
  const row=[];
  for(const x of [-2,-1,0,1,2]){
    const hits=new Raycaster(new Vector3(x,1.5,z),new Vector3(0,-1,0)).intersectObjects(meshes);
    row.push({x,y:hits.length?+hits[0].point.y.toFixed(3):null});
  }
  console.log(JSON.stringify({z,floor:row}));
}
