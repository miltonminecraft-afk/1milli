"""Check all ten saved LP routes against the newly imported detail geometry.

Blender's BVH finds nearby triangles. A triangle/OBB separating-axis check then
tests sleeve envelopes, including triangles wholly inside those envelopes.
The vinyl uses a conservative square envelope around the real circular mesh.
This is a sampled test, not continuous collision detection or visual approval.
"""
import bpy,json,math,datetime,sys,time
from pathlib import Path
from mathutils import Vector,Matrix,Euler
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
scene_name=args[0] if args else 'reference-atmosphere.blend'
output_name=args[1] if len(args)>1 else 'detail-record-clearance.json'
routes=json.loads((O/(args[2] if len(args)>2 else 'record-route-check-samples.json')).read_text())
data=json.loads((O/'record-preview-data.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(O/scene_name))
scene=bpy.context.scene;scene.frame_set(1);bpy.context.view_layer.update()
depsgraph=bpy.context.evaluated_depsgraph_get();obstacles=[]
for ob in scene.objects:
 if ob.type not in ('MESH','CURVE') or not ob.name.startswith('Detail / ') or ob.hide_render:continue
 evaluated=ob.evaluated_get(depsgraph);mesh=evaluated.to_mesh();mesh.calc_loop_triangles()
 vertices=[evaluated.matrix_world@v.co for v in mesh.vertices]
 triangles=[tuple(t.vertices) for t in mesh.loop_triangles]
 if triangles:
  lo=Vector([min(p[i] for p in vertices) for i in range(3)]);hi=Vector([max(p[i] for p in vertices) for i in range(3)])
  obstacles.append({'name':ob.name,'vertices':vertices,'triangles':triangles,'bvh':BVHTree.FromPolygons(vertices,triangles,all_triangles=True),'lo':lo,'hi':hi})
 evaluated.to_mesh_clear()
C=Matrix(((1,0,0),(0,0,-1),(0,1,0)));axes=[Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))]
tolerance=1e-5
def matrix(p):
 rot=C@Euler(tuple(math.radians(p[k]) for k in ('rx','ry','rz')),'XYZ').to_matrix()@C.transposed()
 return Matrix.Translation(Vector((p['x'],-p['z'],p['y'])))@rot.to_4x4()@Matrix.Scale(p['scale'],4)
def overlap_triangle(points,half):
 edges=[points[1]-points[0],points[2]-points[1],points[0]-points[2]]
 candidates=axes+[edges[0].cross(edges[1])]+[axis.cross(edge) for axis in axes for edge in edges]
 for axis in candidates:
  if axis.length_squared<1e-18:continue
  axis=axis.normalized();extent=sum(half[i]*abs(axis[i]) for i in range(3));values=[axis.dot(p) for p in points]
  if min(values)>=extent-tolerance or max(values)<=-extent+tolerance:return False
 return True
# Known intersection, full containment, separation and touching cases make sure
# thin foliage is not discarded merely because it misses the box's surface.
assert overlap_triangle([Vector(v) for v in ((-.2,-.2,0),(.2,-.2,0),(0,.2,0))],Vector((1,1,1)))
assert not overlap_triangle([Vector(v) for v in ((2,0,0),(2,1,0),(2,0,1))],Vector((1,1,1)))
assert not overlap_triangle([Vector(v) for v in ((1,0,0),(1,.5,0),(1,0,.5))],Vector((1,1,1)))
assert overlap_triangle([Vector(v) for v in ((.999,0,0),(.999,.5,0),(.999,0,.5))],Vector((1,1,1)))
collisions=[];coarse_checks=0;nearby_triangle_checks=0;query_count=0;started=time.perf_counter()
for slot,route in enumerate(routes):
 for sample in route['samples']:
  for kind in ('sleeve','vinyl'):
   if kind=='vinyl' and not sample['visible']:continue
   p=sample[kind];m=matrix(p);rot=m.to_quaternion().to_matrix();invrot=rot.transposed()
   local_center=Vector((0,0,0)) if kind=='sleeve' else Vector((0,0,.000525))
   center=m@local_center
   half=Vector((.5,.012,.5) if kind=='sleeve' else (.15,.15,.000525))*p['scale']
   extent=Vector([sum(abs(rot[i][j])*half[j] for j in range(3)) for i in range(3)])
   radius=half.length
   for obstacle in obstacles:
    coarse_checks+=1
    if any(center[i]+extent[i]<=obstacle['lo'][i]-tolerance or center[i]-extent[i]>=obstacle['hi'][i]+tolerance for i in range(3)):continue
    query_count+=1;near=obstacle['bvh'].find_nearest_range(center,radius+tolerance)
    for index in set(hit[2] for hit in near):
     nearby_triangle_checks+=1;points=[invrot@(obstacle['vertices'][i]-center) for i in obstacle['triangles'][index]]
     if overlap_triangle(points,half):
      collisions.append({'slot':slot,'id':route['id'],'time':sample['time'],'kind':kind,'phase':sample['phase'],'object':obstacle['name'],'triangle':index})
      break
 print('ROUTE_CHECKED',slot+1,'collisions',len(collisions),flush=True)
grouped={}
for hit in collisions:
 key=(hit['slot'],hit['kind'],hit['object'])
 if key not in grouped:grouped[key]={'slot':hit['slot'],'kind':hit['kind'],'object':hit['object'],'samples':0,'firstTime':hit['time'],'lastTime':hit['time']}
 grouped[key]['samples']+=1;grouped[key]['lastTime']=hit['time']
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':not collisions,'scene':scene_name,
 'scope':'All ten saved LP routes vs new plants, tables, lamp fixtures and supports only; old shelf/LP checks are separate.',
 'method':'Evaluated triangle meshes, Blender BVH broad phase, triangle-oriented-box SAT narrow phase',
 'records':len(routes),'samplesPerRoute':len(routes[0]['samples']),'motionSeconds':routes[0]['samples'][-1]['time'],
 'obstacleMeshes':len(obstacles),'obstacleTriangles':sum(len(o['triangles']) for o in obstacles),'coarseChecks':coarse_checks,'bvhQueries':query_count,'triangleChecks':nearby_triangle_checks,
 'collisionSamples':len(collisions),'collisionsByObject':list(grouped.values()),'firstCollisions':collisions[:20],
 'elapsedSeconds':time.perf_counter()-started,'ownerOrderWritten':False,'unrealSceneBuilt':False,
 'limits':['45Hz logical samples, not continuous collision detection.','Vinyl square envelope can overestimate collisions at its corners.','Checks the new detail meshes, not a complete rigid-body simulation.','Exact reference appearance and final scene approval remain open.']}
(O/output_name).write_text(json.dumps(report,indent=2)+'\n')
print('DETAIL_CLEARANCE',json.dumps({k:v for k,v in report.items() if k not in ('firstCollisions','collisionsByObject')}),flush=True)
print('COLLISION_GROUPS',json.dumps(report['collisionsByObject']),flush=True)
if collisions:raise RuntimeError(f'{len(collisions)} detail collision samples')
