"""Read plant bounds and projected silhouettes from the current review file."""
import bpy,json,datetime
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path(__file__).resolve().parents[1];O=R/'Review'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-walls.blend'))
s=bpy.context.scene;s.frame_set(1);c=bpy.data.objects['Reference camera / fitted']
rows=[]
for o in s.objects:
 if o.type!='MESH' or o.hide_render or not any(k in o.name.lower() for k in ['pothos','trailing','floor plant','chrome petrol','raised wall plant']):continue
 pts=[o.matrix_world@v.co for v in o.data.vertices]
 q=[world_to_camera_view(s,c,p) for p in pts]
 rows.append({'name':o.name,'vertices':len(pts),'materials':[m.name for m in o.data.materials], 'matrix':[[v for v in row] for row in o.matrix_world], 'bounds':[[fn(p[i] for p in pts) for i in range(3)] for fn in (min,max)],'pixelBounds':[[min(v.x for v in q)*1672,(1-max(v.y for v in q))*941],[max(v.x for v in q)*1672,(1-min(v.y for v in q))*941]]})
d={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':'reference-walls.blend','readOnly':True,'plants':rows}
(O/'plants-before.json').write_text(json.dumps(d,indent=2)+'\n')
print('PLANT_INSPECTION',json.dumps(rows),flush=True)
