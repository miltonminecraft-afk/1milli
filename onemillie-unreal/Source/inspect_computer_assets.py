import bpy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];rows={}
for name in ['desktop-computer','desktop-tower']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(R/'Import/reference-details'/f'{name}.glb'))
    meshes=[]
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        ps=[o.matrix_world@v.co for v in o.data.vertices]
        meshes.append({'name':o.name,'vertices':len(ps),'materials':[m.name for m in o.data.materials if m],'bounds':[[f(p[i] for p in ps) for i in range(3)] for f in (min,max)]})
    rows[name]=meshes
(R/'Review/computer-assets-inspection.json').write_text(json.dumps(rows,indent=2))
print(json.dumps(rows))
