import bpy,json,datetime
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
O=Path(__file__).resolve().parents[1]/'Review';bpy.ops.wm.open_mainfile(filepath=str(O/'reference-room-stacks.blend'));s=bpy.context.scene;s.frame_set(1);deps=bpy.context.evaluated_depsgraph_get()
def tree(obs):
 vs=[];ts=[]
 for o in obs:
  e=o.evaluated_get(deps);m=e.to_mesh();m.calc_loop_triangles();n=len(vs);vs.extend(e.matrix_world@v.co for v in m.vertices);ts.extend(tuple(n+i for i in t.vertices) for t in m.loop_triangles);e.to_mesh_clear()
 return BVHTree.FromPolygons(vs,ts,all_triangles=True),vs
data=json.loads((O/'computer-placement.json').read_text());checks=[];issues=[]
for r in data:
 if 'objects' not in r:continue
 obs=[bpy.data.objects[n] for n in r['objects']];bv,vs=tree(obs);gap=min(p.z for p in vs)-r['supportZ'];hits=[]
 for o in s.objects:
  if o.type!='MESH' or o.hide_render or not (o.name.startswith('Detail / structure music table') or o.name=='Calibration / music table lower shelf'):continue
  other,_=tree([o]);n=len(bv.overlap(other))
  if n:hits.append({'object':o.name,'trianglePairs':n})
 if hits or abs(gap)>.001:issues.append(r['role'])
 checks.append({'role':r['role'],'supportError':gap,'tableIntersections':hits,'min':[min(p[i] for p in vs) for i in range(3)],'max':[max(p[i] for p in vs) for i in range(3)]})
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':not issues,'scene':'reference-room-stacks.blend','checks':checks,'issues':issues,'scope':'Computer and monitor support and triangle intersections against music-table structure. Audio curves visually reviewed; endpoint insertion is intentional.'};(O/'computer-placement-verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));assert not issues
