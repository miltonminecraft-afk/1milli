"""Check reference details: free work area, supports, actual light slots and static contacts."""
import bpy,json,datetime,sys,itertools
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-details.blend'));scene=bpy.context.scene;scene.frame_set(1)
study=json.loads((O/'details-study.json').read_text());bench=bpy.data.objects['W1_1 / Oude werkbank'].matrix_world;inverse=bench.inverted()
def points(obs,space=None):return [(space or Matrix.Identity(4))@o.matrix_world@v.co for o in obs for v in o.data.vertices]
def bounds(obs,space=None):
 p=points(obs,space);return [Vector([f(v[i] for v in p) for i in range(3)]) for f in (min,max)]
def bvh(obs):
 vertices=[];triangles=[]
 for ob in obs:
  evaluated=ob.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh();mesh.calc_loop_triangles();start=len(vertices)
  vertices.extend(evaluated.matrix_world@v.co for v in mesh.vertices);triangles.extend(tuple(start+i for i in t.vertices) for t in mesh.loop_triangles);evaluated.to_mesh_clear()
 return BVHTree.FromPolygons(vertices,triangles,all_triangles=True)
top=bpy.data.objects['Detail / structure workbench timber'];topheight=bounds([top])[1].z;top_tree=bvh([top]);groups=[]
for record in study['benchProps']:
 if record.get('hiddenLooseFasteners'):continue
 obs=[bpy.data.objects[n] for n in record['objects']];groups.append((record['family'],obs))
for record in study['added']:
 if record['role'] in ['workbench pencil cup','folded newspaper at bench edge']:groups.append((record['role'],[bpy.data.objects[n] for n in record['objects']]))
clear_lo,clear_hi=study['clearWorkbenchLocalRectangle'];clear=[];supports=[];issues=[]
for name,obs in groups:
 lo,hi=bounds(obs,inverse);outside=hi.x<=clear_lo[0] or lo.x>=clear_hi[0] or hi.y<=clear_lo[1] or lo.y>=clear_hi[1]
 clear.append({'group':name,'outsideReservedRectangle':outside,'localBounds':[list(lo),list(hi)]})
 if not outside:issues.append('Clear area obstructed: '+name)
 contact=[o for o in obs if 'Vice_Base' in o.name] if name=='Vice_' else obs
 gap=bounds(contact)[0].z-topheight;intersections=len(top_tree.overlap(bvh(obs)))
 supports.append({'group':name,'bottomGap':gap,'tableIntersections':intersections})
 if abs(gap-.0003)>.0001 or intersections:issues.append('Support/intersection: '+name)
collisions=[]
for (a,ao),(b,bo) in itertools.combinations(groups,2):
 hits=len(bvh(ao).overlap(bvh(bo)))
 if hits:collisions.append({'a':a,'b':b,'trianglePairs':hits})
if collisions:issues.append('Workbench prop intersections')
door=[o for o in scene.objects if o.type=='MESH' and not o.hide_render and (o.name.startswith('Architecture /') or o.name.startswith(('Detail / doorway','Detail / shutter sealed')))]
tree=bvh(door);slot_checks=[];y=study['doorway']['backWallY']
for name,z,open_expected in [('lower slot',.032,True),('upper slot',3.33,True),('middle shutter',1.5,False),('above housing',3.62,False)]:
 hit=tree.ray_cast(Vector((-1.2,y+.4,z)),Vector((0,-1,0)),.8);is_open=hit[0] is None
 slot_checks.append({'name':name,'z':z,'open':is_open,'expected':open_expected})
 if is_open!=open_expected:issues.append('Door transmission: '+name)
drum=bpy.data.objects['Detail / chrome petrol drum planter'];drumlo,drumhi=bounds([drum]);p=drum.data.materials[0].node_tree.nodes['Principled BSDF']
assert abs(drumlo.z)<1e-6;assert p.inputs['Metallic'].default_value==1
crate=[]
for record in study['storageCrates']:
 obs=[bpy.data.objects[n] for n in record['objects']];lo,hi=bounds(obs);crate.append({'bottom':lo.z,'top':hi.z,'bounds':[list(lo),list(hi)]})
 if not (lo.x>=-3.389 and hi.x<=-2.958 and lo.y>=2.965 and hi.y<=4.372):issues.append('Storage crate outside shelf envelope')
reference_error=max((Vector(r['referencePixel'])-Vector(r['projectedAnchor'])).length for r in study['electrical'] if 'referencePixel' in r)
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':'reference-details.blend','passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'freeWorkbenchRectangleLocal':study['clearWorkbenchLocalRectangle'],'freeWorkbenchAreaSceneUnitsSquared':1.1*.46*bench.to_scale().x**2,'freeWorkbenchChecks':clear,'supports':supports,'propIntersections':collisions,'doorTransmissionRays':slot_checks,'chromeDrum':{'floorGap':drumlo.z,'height':drumhi.z,'metallic':p.inputs['Metallic'].default_value},'storageCrates':crate,'switchAnchorPixelError':reference_error,'limits':['Reference anchors are manually read; geometry silhouettes remain approximate.','Door rays confirm openings; appearance needs renders.','BVH tests triangle crossings, not solid containment.','No claim of exact material match or Unreal import.']}
(O/'details-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('DETAILS_VERIFIED',json.dumps({'passed':not issues,'issues':issues,'propIntersections':collisions,'doorTransmissionRays':slot_checks}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
