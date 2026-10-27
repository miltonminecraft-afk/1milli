"""Review-only geometry/contact checks for licensed storage/foreground additions."""
import bpy,json,datetime,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review';args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
filename=args[0] if args else 'reference-storage.blend'
outname=args[1] if len(args)>1 else 'storage-verification.json'
study=json.loads((O/'storage-study.json').read_text());cal=json.loads((R/'Reference/camera-calibration.json').read_text())
frames=(1,109,289,577);before={}
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-foliage-clearance.blend'))
names=[o.name for o in bpy.context.scene.objects if not o.hide_viewport and o.type!='LIGHT']
for frame in frames:
 bpy.context.scene.frame_set(frame);before[frame]={n:bpy.data.objects[n].matrix_world.copy() for n in names}
bpy.ops.wm.open_mainfile(filepath=str(O/filename));scene=bpy.context.scene;maximum=0
for frame in frames:
 scene.frame_set(frame)
 for n in names:
  assert n in bpy.data.objects,n
  maximum=max(maximum,max(abs(bpy.data.objects[n].matrix_world[i][j]-before[frame][n][i][j]) for i in range(4) for j in range(4)))
assert maximum<1e-6,maximum
scene.frame_set(1);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
def vertices(objects):return [ob.matrix_world@v.co for ob in objects for v in ob.data.vertices]
def bounds(objects):
 ps=vertices(objects);return [Vector([fn(p[i] for p in ps) for i in range(3)]) for fn in (min,max)]
def bvh(objects):
 points=[];triangles=[]
 for ob in objects:
  ev=ob.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles();offset=len(points)
  points.extend(ev.matrix_world@v.co for v in mesh.vertices);triangles.extend(tuple(i+offset for i in t.vertices) for t in mesh.loop_triangles);ev.to_mesh_clear()
 return BVHTree.FromPolygons(points,triangles,all_triangles=True)
groups={r['role']:[bpy.data.objects[n] for n in r['objects']] for r in study['added']}
checks=[]
for role,objects in groups.items():
 lo,hi=bounds(objects);assert lo.z>=-1e-6,(role,'below floor',lo.z)
 assert lo.x>=cal['room']['leftX']-.001 and hi.y<cal['room']['backY']-.02,(role,'outside room',lo,hi)
 checks.append({'role':role,'bounds':[list(lo),list(hi)],'insideRoomAndAboveFloor':True})
lo,hi=bounds(groups['rear wooden crate']);assert abs(lo.z)<1e-6
deck_lo,deck_hi=bounds([bpy.data.objects['Calibration / music table lower shelf']]);lo,hi=bounds(groups['under-table plastic crate'])
assert abs(lo.z-deck_hi.z-.0003)<1e-6
assert lo.x>deck_lo.x+.002 and hi.x<deck_hi.x-.002 and lo.y>deck_lo.y+.002 and hi.y<deck_hi.y-.002
crate_support={'gap':lo.z-deck_hi.z,'footprintInsideDeck':True}
floor=[bpy.data.objects['Architecture / floor']];rug=groups['foreground Persian rug'];support_tree=bvh(floor+rug);contacts=[]
for role in ('middle padded stool','foreground wooden stool'):
 objects=groups[role];lo,hi=bounds(objects);feet=[p for p in vertices(objects) if p.z<=lo.z+.002]
 gaps=[]
 for p in feet:
  hit=support_tree.ray_cast(p+Vector((0,0,.03)),Vector((0,0,-1)),.1)
  assert hit[0] is not None,(role,'no support');gaps.append(p.z-hit[0].z)
 assert min(gaps)>-1e-5 and max(gaps)<.003,(role,min(gaps),max(gaps))
 contacts.append({'role':role,'footVertices':len(feet),'minimumGap':min(gaps),'maximumGap':max(gaps)})
wood=groups['rear wooden crate'];wood_tree=bvh(wood)
plant=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Detail / floor plant')]
# This imported chosen model is tagged by its asset hierarchy; include descendants.
bikeroot=bpy.data.objects.get('B1_1 / Cafe racer') or bpy.data.objects.get('B1_1 / Café racer')
if not bikeroot:
 candidates=[o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('B1_1')];assert len(candidates)==1,[o.name for o in candidates];bikeroot=candidates[0]
bike=[o for o in bikeroot.children_recursive if o.type=='MESH' and not o.hide_render]
assert bike,'No B1 geometry found'
static_pairs=[]
for label,objects in [('floor plant',plant),('motorcycle',bike)]:
 count=len(wood_tree.overlap(bvh(objects)));assert count==0,('wooden crate',label,count);static_pairs.append({'a':'wooden crate','b':label,'intersectingTrianglePairs':count})
shelf=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Calibration / shelf') and not o.hide_render]
assert shelf
count=len(bvh(groups['foreground wooden stool']).overlap(bvh(shelf)));assert count==0,('wooden stool/shelf',count)
static_pairs.append({'a':'foreground wooden stool','b':'shelf geometry','intersectingTrianglePairs':count})
images=[im for im in bpy.data.images if im.source=='FILE' and im.size[0]>0];assert all(im.packed_file for im in images)
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':filename,'passed':True,'unrealSceneBuilt':False,'userApproved':False,'comparedOriginalObjects':len(names),'sampledFrames':frames,'maximumRetainedMatrixError':maximum,'geometryBounds':checks,'plasticCrateSupport':crate_support,'stoolContacts':contacts,'staticMeshIntersectionChecks':static_pairs,'packedImages':len(images),'limitations':['Static BVH tests check triangle intersections, not general solid containment.','This does not establish appearance fidelity or Unreal compatibility.','All ten LP routes require the separate sampled route audit.']}
(O/outname).write_text(json.dumps(report,indent=2)+'\n');print('STORAGE_VERIFIED',json.dumps(report))
