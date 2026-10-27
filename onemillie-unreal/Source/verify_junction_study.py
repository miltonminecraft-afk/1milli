"""Verify a saved junction candidate against the prior dressing scene."""
import bpy,json,hashlib,struct,datetime
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review';d=json.loads((O/'junction-study.json').read_text());frames=(1,109,289,577)
def geometry(o):
 h=hashlib.sha256()
 if o.type=='MESH':
  for v in o.data.vertices:h.update(struct.pack('<3f',*v.co))
  for p in o.data.polygons:h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
  for uv in o.data.uv_layers:
   h.update(uv.name.encode())
   for p in uv.data:h.update(struct.pack('<2f',*p.uv))
  h.update(json.dumps([m.name if m else None for m in o.data.materials]).encode())
 return h.hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(O/d['sourceScene']));scene=bpy.context.scene
before={o.name:{'geometry':geometry(o),'hide':o.hide_render} for o in scene.objects};poses={}
for f in frames:
 scene.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in scene.objects}
bpy.ops.wm.open_mainfile(filepath=str(O/d['scene']));scene=bpy.context.scene;issues=[];maximum=0
for f in frames:
 scene.frame_set(f)
 for n,m in poses[f].items():maximum=max(maximum,max(abs(bpy.data.objects[n].matrix_world[i][j]-m[i][j]) for i in range(4) for j in range(4)))
if maximum>1e-6:issues.append('Original pose changed')
changes=[]
for n,s in before.items():
 o=bpy.data.objects[n]
 if geometry(o)!=s['geometry']:issues.append('Original geometry/material/UV differs: '+n)
 if o.hide_render!=s['hide']:changes.append(n)
if set(changes)!=set(d['hiddenReplacedObjects']):issues.append('Unexpected visibility change')
scene.frame_set(1);deps=bpy.context.evaluated_depsgraph_get()
def bvh(obs):
 verts=[];polys=[]
 for o in obs:
  ev=o.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles();base=len(verts);verts.extend(ev.matrix_world@v.co for v in mesh.vertices);polys.extend(tuple(base+i for i in t.vertices) for t in mesh.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(verts,polys,all_triangles=True)
new=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Detail / junction completion /')]
room=json.loads((R/'Reference/camera-calibration.json').read_text())['room'];outside=[]
for o in new:
 for v in o.data.vertices:
  p=o.matrix_world@v.co;rx=room['rightX']+.09901683*(room['backY']-p.y)
  if p.x<room['leftX']-.001 or p.x>rx+.001 or p.y>room['backY']+.001 or p.z<0 or p.z>room['height']+.001:outside.append(o.name);break
if outside:issues.append('Outside room')
port_checks=[]
for row in d['conduits']:
 o=bpy.data.objects[row['object']];tree=bvh([o]);dist=[tree.find_nearest(Vector(p))[3] for p in row['ports']];port_checks.append({'object':o.name,'surfaceDistances':dist})
 if max(dist)>.009:issues.append('Port not at conduit surface: '+o.name)
maximum_join=max(j['distance'] for j in d['joins'])
if maximum_join>1e-6:issues.append('Disconnected joint')
native=bpy.data.objects['Detail / electrical / rear small junction'];native_tree=bvh([native]);native_dist=[native_tree.find_nearest(Vector(p))[3] for p in d['sourcePorts']]
if max(native_dist)>.004:issues.append('Source port is not on original lead')
left=[o for o in new if '/ left /' in o.name]+[o for o in scene.objects if o.type=='MESH' and not o.hide_render and o.name.startswith('Detail / connected electrical / rear junction lower')]
right=[o for o in new if '/ right /' in o.name];pairs=len(bvh(left).overlap(bvh(right)))
if pairs:issues.append('Left and right conduit assemblies intersect')
shared=[o for o in new if '/ shared /' in o.name];shared_pairs=len(bvh(shared).overlap(bvh(left+right)))
if shared_pairs:issues.append('Twin brackets intersect conduits')
boundaries=[o for o in scene.objects if o.type=='MESH' and not o.hide_render and (o.name.startswith('Architecture / ') or o.name=='Detail / correction / projecting art wall' or o.name.startswith('Detail / correction / stepped wall casing'))]
boundary_tree=bvh(boundaries);hits=[]
for o in new:
 count=len(bvh([o]).overlap(boundary_tree))
 if count:hits.append({'object':o.name,'pairs':count})
if hits:issues.append('New conduit intersects architecture/casing')
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':d['scene'],'passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'originalObjects':len(before),'preservedFrames':list(frames),'maximumOriginalMatrixChange':maximum,'originalGeometryMaterialUVUnchanged':not any('geometry/material' in i for i in issues),'visibilityChanges':changes,'newMeshes':len(new),'connectedPortPairs':len(d['joins']),'maximumJoinDistance':maximum_join,'sourcePortSurfaceDistance':native_dist,'portChecks':port_checks,'intersectingLeftRightTrianglePairs':pairs,'boundaryMeshes':len(boundaries),'boundaryIntersections':hits,'outsideRoom':outside,'limitations':['Sampled animation poses and selected intersection tests; not complete continuous collision proof.','Source conduit centreline contacts do not establish functional electrical wiring.','Exact photographic match still requires visual review.']}
out['twinBracketConduitIntersections']=shared_pairs
(O/'junction-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('JUNCTION_VERIFIED',json.dumps({k:out[k] for k in ['passed','issues','originalObjects','newMeshes','maximumJoinDistance','intersectingLeftRightTrianglePairs','twinBracketConduitIntersections','boundaryIntersections']}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
