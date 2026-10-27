const test=require('node:test'),assert=require('node:assert/strict');
const {applyLocalModels}=require('../local-models.cjs');
test('local downloads survive loading an older catalog and preserve catalog identities',()=>{
 const downloaded={id:'crate',model:null,download:{status:'login-required'}};
 const other={id:'room',model:'room.glb'};
 const rows=[downloaded,other];
 applyLocalModels(rows,{crate:{model:'crate.glb',modelScale:.05}});
 assert.equal(rows[0],downloaded);
 assert.equal(downloaded.model,'crate.glb');
 assert.equal(downloaded.download.status,'ready');
 assert.equal(downloaded.modelScale,.05);
 assert.deepEqual(other,{id:'room',model:'room.glb'});
});
