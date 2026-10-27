const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=path.resolve(root,'../onemillie-runtime/public/assets/models');
const models={D2:['dj-turntable.glb',1],K1:['kallax-selected-ready.glb',1],K3:['industrial-shelf-ready.glb',1],W1:['old-workbench-ready.glb',1],B1:['cafe-racer.glb',.68],B3:['puch-moped-ready.glb',1],S3:['krk-classic5-ready.glb',1],L3:['industrial-lamp-ready.glb',1],D4:['record-player.glb',1],K4:['record-cabinet-ready.glb',1],V1:['vinyl-record-ready.glb',1],E3:['scanned-workshop.glb',.05],E7:['workshop-garage.glb',1],E8:['empty-garage.glb',1]};
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json')));
for(const a of catalog.assets){a.model=models[a.code]?.[0]||null;a.modelScale=models[a.code]?.[1]||1;if(a.model){const decoded=path.join(root,'source',a.model);fs.copyFileSync(fs.existsSync(decoded)?decoded:path.join(source,a.model),path.join(root,'models',a.model));}}
fs.writeFileSync(path.join(root,'data/catalog.json'),JSON.stringify(catalog,null,2));
const objects=[['K1',[-1.4,0,0],0],['D2',[-1.4,.765,0],0],['S3',[-1.94,.765,0],10],['S3',[-.86,.765,0],-10],['K3',[.5,0,-.2],0],['W1',[-3.1,0,-1.9],0],['B1',[1.7,0,1.3],-25],['B3',[3.1,0,-.7],-20],['L3',[-1.3,2.5,0],0]];
const state={version:1,name:'Mijn inrichting',items:objects.map(([code,position,y],i)=>({id:'start-'+i,assetId:catalog.assets.find(a=>a.code===code).id,name:catalog.assets.find(a=>a.code===code).title,parentId:null,position,rotation:[0,y,0],scale:[1,1,1]}))};
fs.writeFileSync(path.join(root,'data/starter.json'),JSON.stringify(state,null,2));
console.log('Prepared',Object.keys(models).length,'models and',state.items.length,'chosen instances');
