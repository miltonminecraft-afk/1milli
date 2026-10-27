"""Verify that the floor trial preserves previous geometry, animation and lighting."""
import bpy,json,hashlib,struct,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review';frames=(1,109,289,577);floor_name='Architecture / floor'

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

def value(v):
 if isinstance(v,(float,int,str,bool)):return v
 try:return list(v)
 except TypeError:return str(v)

def shader_state(tree):
 if not tree:return None
 nodes=[]
 for n in sorted(tree.nodes,key=lambda n:n.name):
  nodes.append({'name':n.name,'type':n.type,'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],
    'settings':{k:value(getattr(n,k)) for k in ['operation','blend_type','space','uv_map','interpolation','extension','clamp','mute'] if hasattr(n,k)},'image':n.image.name if hasattr(n,'image') and n.image else None})
 return {'nodes':nodes,'links':sorted((l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links)}

def state():
 s=bpy.context.scene;s.frame_set(1)
 materials={}
 for o in s.objects:
  if o.type=='MESH' and o.name!=floor_name:materials[o.name]=[(m.name,shader_state(m.node_tree)) if m else None for m in o.data.materials]
 lights={o.name:{'matrix':[list(row) for row in o.matrix_world],'hidden':o.hide_render,'settings':{k:value(getattr(o.data,k)) for k in ['type','energy','color','size','size_y','shape','spot_size','spot_blend','angle'] if hasattr(o.data,k)}} for o in s.objects if o.type=='LIGHT'}
 poses={}
 for f in frames:
  s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in s.objects}
 return {'hash':mesh_hash(),'poses':poses,'materials':materials,'lights':lights,'world':shader_state(s.world.node_tree)}

bpy.ops.wm.open_mainfile(filepath=str(O/'reference-electrical.blend'));before=state()
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-floor.blend'));after=state()
assert before['hash']==after['hash'];maximum=0
for frame in frames:
 assert before['poses'][frame].keys()==after['poses'][frame].keys()
 for name in before['poses'][frame]:maximum=max(maximum,max(abs(before['poses'][frame][name][i][j]-after['poses'][frame][name][i][j]) for i in range(4) for j in range(4)))
assert maximum==0
for key in ['materials','lights','world']:assert before[key]==after[key],key
floor=bpy.data.objects[floor_name];assert len(floor.data.materials)==1;m=floor.data.materials[0];p=m.node_tree.nodes['Principled BSDF']
assert m.name=='Detail / scanned cement floor' and p.inputs['Metallic'].default_value==0
for name in ['Base Color','Roughness','Normal']:assert p.inputs[name].is_linked
images=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE'];assert len(images)==3 and all(i.packed_file and i.size[0]==2048 for i in images)
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'reference-electrical.blend','scene':'reference-floor.blend','passed':True,'userApproved':False,'unrealSceneBuilt':False,'comparedObjects':len(before['poses'][1]),'sampledFrames':frames,'maximumMatrixError':maximum,'meshTopologyPositionsUVsVisibilitySha256':before['hash'],'lightsAndWorldUnchanged':True,'nonFloorMeshMaterialAssignmentsAndNodesUnchanged':len(before['materials']),'floorMapsPacked':len(images),'sourceResolution':2048,'priorRouteEvidence':'electrical-record-clearance.json','priorDetailEvidence':'electrical-detail-verification.json','priorElectricalEvidence':'electrical-verification.json','priorEvidenceStillApplies':'Material-only change; geometry, UVs, visibility and sampled object matrices remain identical.','limitations':['Shader adjustment does not prove exact visual similarity.','No Unreal material validation or saved Unreal scene.']}
(O/'floor-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('FLOOR_VERIFIED',json.dumps({'passed':True,'objects':out['comparedObjects'],'matrixError':maximum}),flush=True)
