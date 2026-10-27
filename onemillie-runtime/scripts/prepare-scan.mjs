import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
sharp.concurrency(1);sharp.cache(false);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const scene=await io.read('../onemillie/research/building-scan-source.glb');
for(const [i,texture] of scene.getRoot().listTextures().entries()){
  const bytes=await sharp(texture.getImage()).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toBuffer();
  texture.setImage(bytes).setMimeType('image/jpeg');
  console.log(`Texture ${i}: ${(bytes.length/1048576).toFixed(1)} MiB, original resolution retained`);
}
await io.write('public/assets/models/scanned-workshop.glb',scene);
