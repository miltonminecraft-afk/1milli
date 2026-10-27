import bpy,json,datetime,itertools
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review';data=json.loads((O/'electrical-study.json').read_text());cal=json.loads((R/'Reference/camera-calibration.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-electrical.blend'));scene=bpy.context.scene;scene.frame_set(1);deps=bpy.context.evaluated_depsgraph_get()
def bvh(obs):
 vertices=[];triangles=[]
 for ob in obs:
  ev=ob.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles();start=len(vertices);vertices.extend(ev.matrix_world@v.co for v in mesh.vertices);triangles.extend(tuple(start+i for i in t.vertices) for t in mesh.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(vertices,triangles,all_triangles=True)
issues=[];ports=[];room=cal['room'];geometry=[o for o in scene.objects if o.type=='MESH' and not o.hide_render and o.name.startswith('Detail / connected electrical /')]
for rec in data['conduits']:
 ob=bpy.data.objects[rec['object']];tree=bvh([ob]);distances=[]
 for p in rec['ports']:
  hit=tree.find_nearest(Vector(p));distances.append(hit[3])
 if max(distances)>.012:issues.append('Port centre outside tube: '+ob.name)
 ports.append({'object':ob.name,'surfaceDistancesAtPorts':distances})
switch_errors=[(Vector(s['referencePixel'])-Vector(s['projectedFaceCentre'])).length for s in data['switches'] if 'referencePixel' in s]
assert max(switch_errors)<.001
joins=[r['distance'] for r in data['joins']];assert max(joins)<1e-6
room_errors=[]
for ob in geometry:
 for v in ob.data.vertices:
  p=ob.matrix_world@v.co;right=room['rightX']+.09901683*(room['backY']-p.y)
  if p.x<room['leftX']-.001 or p.x>right+.001 or p.y>room['backY']+.001 or p.z>room['height']+.001 or p.z<0:
   room_errors.append({'object':ob.name,'point':list(p)});break
if room_errors:issues.append('Electrical component outside room')
housing=bpy.data.objects['Architecture / shutter housing'];tree=bvh([housing]);housing_collisions=[]
for ob in geometry:
 hits=len(tree.overlap(bvh([ob])))
 if hits:housing_collisions.append({'object':ob.name,'trianglePairs':hits})
if housing_collisions:issues.append('Conduit intersects shutter housing')
upper=[o for o in geometry if 'rear ' in o.name and 'upper' in o.name and 'junction' not in o.name]
lower=[o for o in geometry if 'rear ' in o.name and ('lower' in o.name or 'junction' in o.name)]
assert upper and lower
return_collisions=len(bvh(upper).overlap(bvh(lower)))
casing_collisions=len(bvh(geometry).overlap(bvh([bpy.data.objects['Detail / high wall casing']])))
if return_collisions:issues.append('Upper and lower rear conduit assemblies intersect')
if casing_collisions:issues.append('Conduit intersects high wall casing')
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':'reference-electrical.blend','passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'sourceModules':'Poly Haven modular_electric_cables, CC0','checkedElectricalMeshes':len(geometry),'connectedPortPairs':len(joins),'maximumJoinDistance':max(joins),'maximumSwitchFacePixelError':max(switch_errors),'tubePortSurfaceDistances':ports,'outsideRoom':room_errors,'shutterHousingIntersections':housing_collisions,'limitations':['Joined endpoints and shell clearance do not prove an electrically functional circuit.','Manual reference anchors do not establish an exact photographic match.','Selected joins only; rear junction lead adaptation remains separately documented.','All ten LP routes need the separate sampled audit.']}
out['rearConduitPair']={'upperMeshes':len(upper),'lowerMeshes':len(lower),'intersectingTrianglePairs':return_collisions}
out['highWallCasingIntersections']=casing_collisions
(O/'electrical-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('ELECTRICAL_VERIFIED',json.dumps({'passed':not issues,'issues':issues,'outsideRoom':room_errors,'housingCollisions':housing_collisions}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
