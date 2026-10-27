"""Verify wall-only material/UV changes while retaining the rest of the saved room."""
import bpy,json,hashlib,struct,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review';d=json.loads((O/'walls-study.json').read_text());names={r['object'] for r in d['changedWalls']};frames=(1,109,289,577)
def value(v):
 if isinstance(v,(float,int,str,bool)):return v
 try:return list(v)
 except TypeError:return str(v)
def shader(tree):
 if not tree:return None
 nodes=[]
 for n in sorted(tree.nodes,key=lambda n:n.name):
  nodes.append({'name':n.name,'type':n.type,'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],'settings':{k:value(getattr(n,k)) for k in ['operation','blend_type','space','uv_map','interpolation','extension','clamp','mute'] if hasattr(n,k)},'image':n.image.name if hasattr(n,'image') and n.image else None})
 return {'nodes':nodes,'links':sorted((l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links)}
def geometry():
 h=hashlib.sha256()
 for o in sorted((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:o.name):
  h.update(o.name.encode());h.update(bytes([o.hide_render,o.hide_viewport]));h.update(struct.pack('<III',len(o.data.vertices),len(o.data.polygons),len(o.data.loops)))
  for v in o.data.vertices:h.update(struct.pack('<3f',*v.co))
  for p in o.data.polygons:h.update(struct.pack('<I',len(p.vertices)));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
  for uv in o.data.uv_layers:
   if o.name in names and uv.name=='ReferenceWallUV':continue
   h.update(uv.name.encode())
   for p in uv.data:h.update(struct.pack('<2f',*p.uv))
 return h.hexdigest()
def state():
 s=bpy.context.scene;s.frame_set(1);materials={o.name:[(m.name,shader(m.node_tree)) if m else None for m in o.data.materials] for o in s.objects if o.type=='MESH' and o.name not in names}
 lights={o.name:{'hidden':o.hide_render,'settings':{k:value(getattr(o.data,k)) for k in ['type','energy','color','size','size_y','shape','spot_size','spot_blend','angle'] if hasattr(o.data,k)}} for o in s.objects if o.type=='LIGHT'}
 poses={}
 for f in frames:
  s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in s.objects}
 return {'geometry':geometry(),'poses':poses,'materials':materials,'lights':lights,'world':shader(s.world.node_tree),'view':(s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure)}
bpy.ops.wm.open_mainfile(filepath=str(O/d['sourceScene']));before=state()
bpy.ops.wm.open_mainfile(filepath=str(O/d['scene']));after=state();issues=[];maximum=0
for key in ['geometry','materials','lights','world','view']:
 if before[key]!=after[key]:issues.append('Unexpected change: '+key)
for f in frames:
 if before['poses'][f].keys()!=after['poses'][f].keys():issues.append('Object inventory changed');continue
 for name,matrix in before['poses'][f].items():maximum=max(maximum,max(abs(after['poses'][f][name][i][j]-matrix[i][j]) for i in range(4) for j in range(4)))
if maximum>1e-6:issues.append('Original pose changed')
bpy.context.scene.frame_set(1);mapping=[]
for r in d['changedWalls']:
 o=bpy.data.objects[r['object']];uv=o.data.uv_layers['ReferenceWallUV'];normal_matrix=o.matrix_world.to_3x3().inverted().transposed();error=0
 for p in o.data.polygons:
  n=normal_matrix@p.normal;axis=max(range(3),key=lambda i:abs(n[i]));pair=(1,2) if axis==0 else ((0,2) if axis==1 else (0,1))
  for index in p.loop_indices:
   point=o.matrix_world@o.data.vertices[o.data.loops[index].vertex_index].co;error=max(error,abs(uv.data[index].uv.x-point[pair[0]]/r['tileSizeSceneUnits']),abs(uv.data[index].uv.y-point[pair[1]]/r['tileSizeSceneUnits']))
 m=o.data.materials[0];maps=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
 if m.name!=r['material'] or len(maps)!=3 or not all(im.packed_file and im.size[0]==4096 for im in maps):issues.append('Wall material/maps differ: '+o.name)
 if error>1e-5:issues.append('Wall UV scale differs: '+o.name)
 mapping.append({'object':o.name,'maximumWorldProjectionUVError':error,'mapsPacked':len(maps),'resolution':4096})
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':d['scene'],'sourceScene':d['sourceScene'],'passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'originalObjects':len(before['poses'][1]),'sampledFrames':frames,'maximumOriginalMatrixChange':maximum,'meshTopologyPositionsOriginalUVsVisibilitySha256':after['geometry'],'nonWallMaterialAssignmentsAndNodesPreserved':len(before['materials']),'lightsWorldAndColourManagementUnchanged':True,'wallMappings':mapping,'priorRouteEvidence':'junction-record-clearance.json','priorEvidenceApplicability':'Only materials and an additional wall UV layer changed. Collision geometry and sampled original poses remain identical; no new objects. Prior LP route and dressing/junction geometry checks remain applicable.','limits':['Reference wall finish is a visual interpretation, not an identified physical material.','Exact appearance still requires visual comparison.','Four sampled poses, not continuous collision certification.','Not validated in Unreal.']}
(O/'walls-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('WALLS_VERIFIED',json.dumps({k:out[k] for k in ['passed','issues','originalObjects','maximumOriginalMatrixChange']}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
