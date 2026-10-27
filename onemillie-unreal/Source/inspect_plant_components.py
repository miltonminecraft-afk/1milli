import bpy,bmesh,json
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-walls.blend'));rows=[]
for name in ['Detail / foreground pothos / POTHOS_POTHOS_Mat_0','Detail / floor plant / defaultMaterial','Detail / floor plant / defaultMaterial.001']:
 o=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(o.data);seen=set();cs=[]
 for v in bm.verts:
  if v in seen:continue
  todo=[v];seen.add(v);points=[]
  while todo:
   a=todo.pop();points.append(a.co.copy())
   for e in a.link_edges:
    n=e.other_vert(a)
    if n not in seen:seen.add(n);todo.append(n)
  cs.append({'vertices':len(points),'bounds':[[f(p[i] for p in points) for i in range(3)] for f in (min,max)]})
 rows.append({'name':name,'components':cs});bm.free()
(O/'plant-components.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PLANT_COMPONENTS',json.dumps(rows),flush=True)
