"""Ensure a material-only candidate does not invalidate earlier motion/contact checks."""
import bpy,json,hashlib,struct,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review';frames=(1,109,289,577)
def mesh_hash():
 h=hashlib.sha256()
 for o in sorted((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:o.name):
  h.update(o.name.encode());h.update(bytes([o.hide_render,o.hide_viewport]));h.update(struct.pack('<III',len(o.data.vertices),len(o.data.polygons),len(o.data.loops)))
  for v in o.data.vertices:h.update(struct.pack('<fff',*v.co))
  for p in o.data.polygons:
   h.update(struct.pack('<I',len(p.vertices)))
   for index in p.vertices:h.update(struct.pack('<I',index))
  for uv in o.data.uv_layers:
   h.update(uv.name.encode())
   for loop in uv.data:h.update(struct.pack('<ff',*loop.uv))
 return h.hexdigest()
def light_state():return {o.name:{'matrix':[list(row) for row in o.matrix_world],'power':o.data.energy,'color':list(o.data.color),'hidden':o.hide_render} for o in bpy.context.scene.objects if o.type=='LIGHT'}
def poses():
 out={}
 for f in frames:
  bpy.context.scene.frame_set(f);out[f]={o.name:o.matrix_world.copy() for o in bpy.context.scene.objects}
 return out
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-details.blend'));bpy.context.scene.frame_set(1)
source_hash=mesh_hash();source_poses=poses();bpy.context.scene.frame_set(1);source_lights=light_state()
bike_names={o.name for o in bpy.data.objects['B1_1 / Café racer'].children_recursive if o.type=='MESH'}
outside={o.name:[m.name if m else None for m in o.data.materials] for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in bike_names}
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-finish.blend'));bpy.context.scene.frame_set(1)
target_hash=mesh_hash();assert target_hash==source_hash
target_poses=poses();maximum=0
for frame in frames:
 assert source_poses[frame].keys()==target_poses[frame].keys()
 for name in source_poses[frame]:maximum=max(maximum,max(abs(source_poses[frame][name][i][j]-target_poses[frame][name][i][j]) for i in range(4) for j in range(4)))
assert maximum==0;bpy.context.scene.frame_set(1);assert light_state()==source_lights
for name,names in outside.items():assert names==[m.name if m else None for m in bpy.data.objects[name].data.materials]
for name in bike_names:assert all(m.name.startswith('Detail / B1 finish /') for m in bpy.data.objects[name].data.materials)
for name in ['SoftBlack','Glossy_Black','Cable','Bike_Seat','Bike_Tank']:
 p=bpy.data.materials['Detail / B1 finish / '+name].node_tree.nodes['Principled BSDF'];assert p.inputs['Metallic'].default_value==0 and not p.inputs['Metallic'].is_linked
p=bpy.data.materials['Detail / B1 finish / Chrome.002'].node_tree.nodes['Principled BSDF'];assert p.inputs['Metallic'].default_value==1 and not p.inputs['Metallic'].is_linked
assert p.inputs['Normal'].is_linked and p.inputs['Roughness'].is_linked
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'source':'reference-details.blend','scene':'reference-finish.blend','unrealSceneBuilt':False,'userApproved':False,'comparedObjects':len(source_poses[1]),'sampledFrames':list(frames),'maximumMatrixError':maximum,'meshTopologyPositionsUVsVisibilitySha256':source_hash,'lightsUnchanged':True,'nonMotorcycleMaterialAssignmentsUnchanged':len(outside),'motorcycleMeshesWithIsolatedMaterials':len(bike_names),'nonmetalPaintRubberLeather':True,'chromeMetallic':1,'chromeNormalAndRoughnessMapsRetained':True,'priorRouteEvidence':'details-record-clearance.json','priorRouteEvidenceStillApplies':'All mesh topology, vertex positions, UVs, visibility and sampled transforms unchanged; material-only edit.','currentContactEvidence':'finish-detail-verification.json','limitations':['Visual finish is adapted, not an exact model/material reconstruction.','No Unreal level or Unreal material validation.']}
(O/'finish-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('FINISH_VERIFIED',json.dumps(out),flush=True)
