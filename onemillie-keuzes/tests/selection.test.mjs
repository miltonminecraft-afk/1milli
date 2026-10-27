import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSelection,enrichSelection} from '../lib/selection.mjs';
const {assets}=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url)));
const defaults=JSON.parse(fs.readFileSync(new URL('../data/default-selection.json',import.meta.url)));
const good={items:defaults.items,notes:'naast de kast',revision:0};
test('preserves all confirmed models and both speakers',()=>{
 const result=validateSelection(good,assets);assert.ok(result);assert.equal(result.items.length,12);assert.equal(result.items.reduce((n,i)=>n+i.quantity,0),13);
 assert.equal(enrichSelection(result.items,assets).find(i=>i.code==='S3').quantity,2);
});
test('rejects unknown IDs, duplicates, invalid amounts and notes',()=>{
 for(const quantity of [0,-1,1.5,100,'2',null])assert.equal(validateSelection({...good,items:[{id:assets[0].id,quantity}]},assets),null);
 assert.equal(validateSelection({...good,items:[{id:'unknown',quantity:1}]},assets),null);
 assert.equal(validateSelection({...good,items:[good.items[0],good.items[0]]},assets),null);
 assert.equal(validateSelection({...good,notes:'x'.repeat(2001)},assets),null);
 assert.equal(validateSelection({...good,revision:-1},assets),null);
});
test('allows clearing selection and multiple room candidates',()=>{
 assert.deepEqual(validateSelection({...good,items:[]},assets).items,[]);
 const items=assets.filter(a=>a.kind==='room').slice(0,2).map(a=>({id:a.id,quantity:1}));
 assert.equal(validateSelection({...good,items},assets).items.length,2);
});
test('uses catalog identity instead of client-supplied titles or links',()=>{
 const payload={...good,items:[{id:assets[0].id,quantity:2,title:'Fake',source:'https://example.invalid'}]};
 const valid=validateSelection(payload,assets),enriched=enrichSelection(valid.items,assets);
 assert.equal(enriched[0].title,assets[0].title);assert.equal(enriched[0].source,assets[0].source);
});
