"""Measure the existing rear junction and the unused source lead, without edits."""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'Review'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-dressing.blend'))
o=bpy.data.objects['Detail / electrical / rear small junction']
bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
seen=set();groups=[]
for start in bm.verts:
 if start in seen:continue
 stack=[start];seen.add(start);group=[]
 while stack:
  v=stack.pop();group.append(v)
  for e in v.link_edges:
   other=e.other_vert(v)
   if other not in seen:seen.add(other);stack.append(other)
 points=[v.co for v in group];world=[o.matrix_world@v for v in points]
 def bounds(ps):return [[f(p[i] for p in ps) for i in range(3)] for f in (min,max)]
 groups.append({'vertices':len(group),'localBounds':bounds(points),'worldBounds':bounds(world)})
bm.free()
out={'matrix':[list(row) for row in o.matrix_world],'components':groups}
(O/'rear-junction-inspection.json').write_text(json.dumps(out,indent=2)+'\n')
print('JUNCTION',json.dumps(out),flush=True)
old=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'Import/reference-details/modular_electric_cables/modular_electric_cables_2k.gltf'));bpy.context.view_layer.update()
for o in set(bpy.data.objects)-old:
 if o.name in ['cable_double_mount','cable_double_10cm']:
  pts=[o.matrix_world@v.co for v in o.data.vertices]
  print('DOUBLE_PART',o.name,json.dumps(bounds(pts)),flush=True)
