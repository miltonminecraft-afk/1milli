import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
await fs.mkdir('../onemillie-studio/source',{recursive:true});
for(const file of ['workshop-garage','empty-garage','record-player','record-cabinet-ready','vinyl-record-ready']){
 const doc=await io.read('public/assets/models/'+file+'.glb');
 for(const ext of doc.getRoot().listExtensionsUsed())if(ext.extensionName==='EXT_meshopt_compression')ext.dispose();
 await io.write('../onemillie-studio/source/'+file+'.glb',doc);
 console.log('DECODED',file);
}
