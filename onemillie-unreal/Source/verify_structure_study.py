"""Validate the revised source-derived table frames and cabinet post envelopes."""
import bpy,json,sys,runpy,datetime
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'Review'
# Reuse the previously validated crate/stool support and retained-animation checks.
original_args=sys.argv[:];sys.argv=[__file__,'--','reference-structure.blend','structure-storage-verification.json']
helpers=runpy.run_path(str(R/'Source/verify_storage_study.py'));sys.argv=original_args
bounds=helpers['bounds'];bvh=helpers['bvh'];scene=bpy.context.scene
study=json.loads((O/'structure-study.json').read_text());top_checks=[];support_checks=[]
cal=json.loads((R/'Reference/camera-calibration.json').read_text())
for record in study['tabletops']:
 top=bpy.data.objects[record['object']];lo,hi=bounds([top]);assert abs(hi.z-record['oldTop'])<1e-6
 assert abs(hi.z-lo.z-.075)<1e-6
 assert len(top.data.polygons)==612
 tree=bvh([top]);role=record['role'];legs=bpy.data.objects['Detail / structure '+role+' W2 legs']
 points=[legs.matrix_world@v.co for v in legs.data.vertices];high=max(p.z for p in points)
 contacts=[]
 for point in points:
  if point.z<high-1e-5:continue
  hit=tree.ray_cast(point+Vector((0,0,-.001)),Vector((0,0,1)),.01)
  assert hit[0] is not None,(role,'leg misses underside')
  gap=hit[0].z-point.z;assert abs(gap)<1e-5,(role,gap);contacts.append(gap)
 assert contacts
 leglo,leghi=bounds([legs]);assert abs(leglo.z)<1e-6
 top_checks.append({'role':role,'topHeight':hi.z,'previousTopHeight':record['oldTop'],'thickness':hi.z-lo.z,'sourceBoardFaces':len(top.data.polygons),'topUnchanged':True})
 support_checks.append({'role':role,'floorGap':leglo.z,'topContactVertices':len(contacts),'maximumLegUndersideGap':max(abs(v) for v in contacts)})
post_checks=[]
for oldname in sorted(set(r['replaces'] for r in study['cabinetPosts'])):
 old=bpy.data.objects[oldname];oldlo,oldhi=bounds([old]);new=[bpy.data.objects[r['object']] for r in study['cabinetPosts'] if r['replaces']==oldname];lo,hi=bounds(new)
 targets=[r['targetBounds'] for r in study['cabinetPosts'] if r['replaces']==oldname]
 targetlo=Vector([min(t[0][i] for t in targets) for i in range(3)]);targethi=Vector([max(t[1][i] for t in targets) for i in range(3)])
 error=max(abs(lo[i]-targetlo[i]) for i in range(3));error=max(error,max(abs(hi[i]-targethi[i]) for i in range(3)))
 assert error<1e-6,(oldname,error)
 assert lo.x>=cal['room']['leftX']+.0029,(oldname,'left-wall contact')
 assert old.hide_render and old.hide_get()
 post_checks.append({'replacedObject':oldname,'sourceSections':len(new),'maximumTargetEnvelopeError':error,'outwardExpansion':.02})
deck=bpy.data.objects['Calibration / music table lower shelf'];lower=bpy.data.objects['Detail / structure music table lower rails'];gap=bounds([deck])[0].z-bounds([lower])[1].z;assert abs(gap)<1e-6
crate=helpers['groups']['under-table plastic crate'];frame=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Detail / structure music table ') and 'timber' not in o.name]
count=len(bvh(crate).overlap(bvh(frame)));assert count==0,('crate/frame collision',count)
woodstool=helpers['groups']['foreground wooden stool'];posts=[bpy.data.objects[r['object']] for r in study['cabinetPosts']]
countpost=len(bvh(woodstool).overlap(bvh(posts)));assert countpost==0,('stool/new posts',countpost)
bench=bpy.data.objects['Detail / structure workbench timber'];bench_tree=bvh([bench]);prop_checks=[]
for group in study['supportedWorkbenchProps']:
 objects=[bpy.data.objects[n] for n in group['newObjects']];contact=[bpy.data.objects[n] for n in group['contactObjects']]
 lo,hi=bounds(contact);assert abs(lo.z-group['targetTop']-.0003)<1e-6
 intersections=len(bench_tree.overlap(bvh(objects)));assert intersections==0,(group['family'],'tool inside top',intersections)
 assert all(bpy.data.objects[n].hide_render for n in group['originalObjects'])
 # X/Y and every within-tool offset remain unchanged; only a rigid Z translation.
 error=0
 for oldname,newname in zip(group['originalObjects'],group['newObjects']):
  old=bpy.data.objects[oldname];new=bpy.data.objects[newname]
  assert len(old.data.vertices)==len(new.data.vertices)
  for a,b in zip(old.data.vertices,new.data.vertices):
   delta=(new.matrix_world@b.co)-(old.matrix_world@a.co)-Vector((0,0,group['translationZ']));error=max(error,delta.length)
 assert error<2e-6,error
 prop_checks.append({'family':group['family'],'parts':len(objects),'supportGap':lo.z-group['targetTop'],'intersectingTopTriangles':intersections,'maximumRigidTranslationError':error})
drawers=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Tool_Cabinet_') and not o.hide_render]
bench_frame=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('Detail / structure workbench W2')]
drawer_count=len(bvh(drawers).overlap(bvh(bench_frame)));assert drawer_count==0,('drawer cabinet/frame',drawer_count)
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':'reference-structure.blend','passed':True,'userApproved':False,'unrealSceneBuilt':False,'baseVerification':'structure-storage-verification.json','tabletops':top_checks,'frameSupports':support_checks,'cabinetPostEnvelopes':post_checks,'lowerDeckRailGap':gap,'crateFrameIntersectingTrianglePairs':count,'stoolPostIntersectingTrianglePairs':countpost,'supportedWorkbenchProps':prop_checks,'drawerFrameIntersectingTrianglePairs':drawer_count,'sourceW2SetsUsed':study['sourceSelectedW2Sets'],'limitations':['Physical metres remain provisional; thickness is 0.075 scene units.','Geometry contacts and sampled routes do not establish visual fidelity.','BVH triangle intersections do not establish general solid containment.','Unreal import and rendered lighting are not verified.']}
(O/'structure-verification.json').write_text(json.dumps(report,indent=2)+'\n');print('STRUCTURE_VERIFIED',json.dumps(report))
