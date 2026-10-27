import {NodeIO} from '@gltf-transform/core';
import {getBounds} from '@gltf-transform/functions';
const io=new NodeIO();
for(const file of ['vinyl-record-ready.glb','record-player.glb']){const doc=await io.read('public/assets/models/'+file);console.log(file,JSON.stringify(getBounds(doc.getRoot().listScenes()[0])));}
