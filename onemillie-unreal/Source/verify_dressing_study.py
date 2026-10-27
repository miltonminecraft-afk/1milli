import bpy,json,datetime
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from bpy_extras.object_utils import world_to_camera_view
R=Path(__file__).resolve().parents[1];O=R/'Review';d=json.loads((O/'dressing-study.json').read_text());cal=json.loads((R/'Reference/camera-calibration.json').read_text());frames=(1,109,289,577)
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-floor.blend'));before={}
for f in frames:
 bpy.context.scene.frame_set(f);before[f]={o.name:o.matrix_world.copy() for o in bpy.context.scene.objects}
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-dressing.blend'));scene=bpy.context.scene;maximum=0
for f in frames:
 scene.frame_set(f)
 for n,m in before[f].items():maximum=max(maximum,max(abs(bpy.data.objects[n].matrix_world[i][j]-m[i][j]) for i in range(4) for j in range(4)))
scene.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();camera=bpy.data.objects['Reference camera / fitted'];issues=[]
if maximum>1e-6:issues.append('Original object pose changed')
def objects(names):return [bpy.data.objects[n] for n in names]
def points(obs):return [o.matrix_world@v.co for o in obs for v in o.data.vertices]
def bounds(obs):
 ps=points(obs);return [Vector([f(p[i] for p in ps) for i in range(3)]) for f in (min,max)]
def bvh(obs):
 vs=[];ts=[]
 for o in obs:
  ev=o.evaluated_get(deps);m=ev.to_mesh();m.calc_loop_triangles();base=len(vs);vs.extend(ev.matrix_world@v.co for v in m.vertices);ts.extend(tuple(base+i for i in t.vertices) for t in m.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(vs,ts,all_triangles=True)
arts=[]
for record in d['artworks']:
 o=bpy.data.objects[record['object']];a,b=bounds([o]);gap=a.x-record['wallX'];uv=o.data.uv_layers['ReferencePrintUV'];error=0
 for loop in o.data.loops:
  p=o.matrix_world@o.data.vertices[loop.vertex_index].co;q=world_to_camera_view(scene,camera,p);actual=Vector((q.x*1672,(1-q.y)*941));target=Vector((uv.data[loop.index].uv.x*1672,(1-uv.data[loop.index].uv.y)*941));error=max(error,(actual-target).length)
 if abs(gap-.0015)>1e-6 or b.x-a.x>1e-6 or error>.002:issues.append('Artwork plane or image position differs: '+o.name)
 arts.append({'object':o.name,'wallGap':gap,'planarityError':b.x-a.x,'maximumImageUVPixelError':error})
suspension=[]
for r in d['suspension']:
 a=Vector(r['bottom']);b=Vector(r['top']);fixture=bpy.data.objects[r['fixture']];tree=bvh([fixture]);hit=tree.find_nearest(a);error=hit[3];ceiling_error=abs(b.z-cal['room']['height'])
 if error>.004 or ceiling_error>1e-6:issues.append('Suspension does not meet fixture/ceiling')
 suspension.append({'object':r['object'],'length':(b-a).length,'fixtureSurfaceDistance':error,'ceilingError':ceiling_error})
wall=bpy.data.objects[d['wall']['object']];wa,wb=bounds([wall]);tree=bvh([wall]);intersections=[]
for name in d['reroutedConduits']+d['steppedCasing']+d['cabinet']['objects']:
 o=bpy.data.objects[name];count=len(tree.overlap(bvh([o])))
 inside=sum(wa.x+1e-5<p.x<wb.x-1e-5 and wa.y+1e-5<p.y<wb.y-1e-5 and wa.z+1e-5<p.z<wb.z-1e-5 for p in points([o]))
 if count or inside:intersections.append({'object':name,'triangleIntersections':count,'verticesInsideWall':inside})
if intersections:issues.append('Added wall overlaps adjacent dressing')
container_checks=[];content_checks=[]
for i,r in enumerate(d['containers']):
 obs=objects(r['objects']);a,b=bounds(obs);gap=a.z-r['supportZ'];next_z=min([z-.0175 for z in cal['shelfEnvelope']['levels'] if z>a.z+.03]+[cal['room']['height']])
 inside=a.x>=cal['room']['leftX'] and b.x<=cal['shelfEnvelope']['frontX'] and a.y>=cal['shelfEnvelope']['nearY'] and b.y<=cal['shelfEnvelope']['farY'] and b.z<next_z
 if not inside or abs(gap)>.001:issues.append('Container support/bounds failed '+str(i+1))
 container_checks.append({'index':i+1,'kind':r['kind'],'supportGap':gap,'insideShelfVolume':inside,'headroom':next_z-b.z})
 for item in [it for it in d['contents'] if it['container']==i+1]:
  props=objects(item['objects']);pa,pb=bounds(props);hits=len(bvh(obs).overlap(bvh(props)));inside_contents=pa.x>a.x and pb.x<b.x and pa.y>a.y and pb.y<b.y and pa.z>a.z and pb.z<next_z
  if hits or not inside_contents:issues.append('Contents intersect or leave crate '+str(i+1))
  content_checks.append({'container':i+1,'family':item['family'],'containerTriangleIntersections':hits,'insideContainerFootprintAndShelfHeadroom':inside_contents})
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':'reference-dressing.blend','passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'originalObjects':len(before[1]),'frames':frames,'maximumOriginalMatrixError':maximum,'wallProjectionDepth':wb.x-cal['room']['leftX'],'artworkChecks':arts,'suspensionChecks':suspension,'wallDressingIntersections':intersections,'containers':container_checks,'contents':content_checks,'limits':['Image landmarks were measured manually; subpixel UV alignment is not proof of exact reference geometry.','BVH checks are selected surface intersections, not a complete physics simulation.','Full LP route check is separate.']}
(O/'dressing-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('DRESSING_VERIFIED',json.dumps({'passed':not issues,'issues':issues,'suspension':suspension,'wallIntersections':intersections,'contents':content_checks}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
