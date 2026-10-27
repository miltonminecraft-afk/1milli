import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {compactPrimitive,prune,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
import fs from 'node:fs';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Pass source C2 GLB and output GLB');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(input);
const primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0],positions=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices();
const selected=[];for(let i=0;i<indices.getCount();i+=3){const tri=[0,1,2].map(j=>indices.getScalar(i+j));if(tri.every(v=>positions[v*3]<-2))selected.push(...tri);}
if(selected.length!==1368)throw Error('Expected one of the five 456-triangle crates');
indices.setArray(new Uint16Array(selected));compactPrimitive(primitive);
doc.getRoot().setExtras({source:'https://sketchfab.com/3d-models/antique-wooden-milk-crates-489a6f095dc44bb1b279ed58e5bb3571',author:'CurlyFryWhy',license:'CC BY 4.0',modification:'One freestanding crate isolated from the original five-crate mesh; textures resized.'});
await doc.transform(prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}));
await io.write(output,doc);console.log(JSON.stringify({triangles:selected.length/3,bytes:fs.statSync(output).size,output}));
