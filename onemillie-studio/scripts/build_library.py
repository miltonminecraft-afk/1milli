"""Prepare existing, attributed assets for Blender's native Asset Browser."""
import bpy, json, math, uuid
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
SOURCE = WORK / 'onemillie-runtime/public/assets'
CATALOG = json.loads((WORK / 'onemillie-keuzes/data/catalog.json').read_text(encoding='utf-8'))['assets']
FILES = {
 'D2': ('dj-turntable.glb', 1), 'K1': ('kallax-selected-ready.glb', 1),
 'K3': ('industrial-shelf-ready.glb', 1), 'W1': ('old-workbench-ready.glb', 1),
 'B1': ('cafe-racer.glb', .68), 'B3': ('puch-moped-ready.glb', 1),
 'S3': ('krk-classic5-ready.glb', 1), 'L3': ('industrial-lamp-ready.glb', 1),
 'D4': ('record-player.glb', 1), 'K4': ('record-cabinet-ready.glb', 1),
 'V1': ('vinyl-record-ready.glb', 1), 'E3': ('scanned-workshop.glb', .05),
 'E7': ('workshop-garage.glb', 1), 'E8': ('empty-garage.glb', 1),
}

def bounds(objects):
    pts = [o.matrix_world @ Vector(p) for o in objects if o.type == 'MESH' for p in o.bound_box]
    return Vector(tuple(min(p[i] for p in pts) for i in range(3))), Vector(tuple(max(p[i] for p in pts) for i in range(3)))

categories = {a['category'] for a in CATALOG if a['code'] in FILES}
ids = {c: str(uuid.uuid5(uuid.NAMESPACE_URL, 'onemillie/' + c)) for c in categories}
(ROOT/'library/blender_assets.cats.txt').write_text('VERSION 1\n\n'+'\n'.join(f'{ids[c]}:{c}:{c}' for c in sorted(categories))+'\n', encoding='utf-8')
report=[]
for asset in CATALOG:
    code=asset['code']
    if code not in FILES: continue
    filename, scale=FILES[code]
    target=ROOT/'library'/f'{code}.blend'
    if target.exists():
        print('ALREADY_BUILT', code, flush=True)
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    local=ROOT/'source'/filename
    bpy.ops.import_scene.gltf(filepath=str(local if local.exists() else SOURCE/'models'/filename))
    objects=list(bpy.context.scene.objects)
    for o in list(objects):
        if o.type in {'CAMERA','LIGHT'}:
            bpy.data.objects.remove(o, do_unlink=True); objects.remove(o)
    bpy.context.view_layer.update()
    lo,hi=bounds(objects)
    # Retain prepared metre scales. Earlier whole-room sources get a useful 10 m preview width.
    if code=='E7': scale=10/max(hi.x-lo.x, hi.y-lo.y)
    offset=Vector((-(lo.x+hi.x)/2, -(lo.y+hi.y)/2, -lo.z))
    normal=Matrix.Scale(scale,4) @ Matrix.Translation(offset)
    for o in objects:
        if o.parent not in objects: o.matrix_world=normal @ o.matrix_world
    collection=bpy.data.collections.new(f'{code} · {asset["title"]}')
    bpy.context.scene.collection.children.link(collection)
    for o in objects:
        for c in list(o.users_collection): c.objects.unlink(o)
        collection.objects.link(o)
    collection['asset_id']=asset['id']; collection['code']=code
    collection['source']=asset['source']; collection['kind']=asset['kind']
    collection['source_file']=filename; collection['normalization']=list(v for row in normal for v in row)
    collection.asset_mark()
    data=collection.asset_data
    data.author=asset['author']; data.description=asset['description']+' | '+asset['source']
    data.license='CC BY 4.0'; data.copyright=asset['author']; data.catalog_id=ids[asset['category']]
    data.tags.new(asset['category']); data.tags.new(code)
    preview=WORK/'onemillie-keuzes/public'/asset['image']
    if preview.exists():
        with bpy.context.temp_override(id=collection): bpy.ops.ed.lib_id_load_custom_preview(filepath=str(preview))
    bpy.ops.file.pack_all()
    bpy.data.libraries.write(str(target), {collection}, path_remap='RELATIVE', fake_user=True, compress=True)
    bpy.context.view_layer.update()
    lo,hi=bounds(objects)
    report.append({'code':code,'collection':collection.name,'dimensions':list(hi-lo),'file':str(target),'source':asset['source']})
    print('ASSET_READY',code,list(hi-lo),flush=True)
(ROOT/'library/build-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(ROOT/'library/ATTRIBUTION.txt').write_text('\n\n'.join(f'{a["code"]} — {a["title"]}\n{a["author"]}\n{a["source"]}\n{a["license"]["url"]}\nBewerking: oriëntatie, schaal en vloer-oorsprong voor plaatsing in Blender.' for a in CATALOG if a['code'] in FILES),encoding='utf-8')
print('LIBRARY_COMPLETE',len(FILES),flush=True)
