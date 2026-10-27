"""Verify a light/material-only candidate against its prior saved scene."""
import bpy,json,hashlib,struct,datetime
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review';d=json.loads((O/'daylight-study.json').read_text());frames=(1,109,289,577);floor_name='Architecture / floor'
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
   h.update(uv.name.encode())
   for p in uv.data:h.update(struct.pack('<2f',*p.uv))
 return h.hexdigest()
def state():
 s=bpy.context.scene;s.frame_set(1);materials={o.name:[(m.name,shader(m.node_tree)) if m else None for m in o.data.materials] for o in s.objects if o.type=='MESH' and o.name!=floor_name}
 lights={o.name:{'hidden':o.hide_render,'energy':o.data.energy,'type':o.data.type,'color':list(o.data.color),'size':o.data.size if o.data.type=='AREA' else None,'sizeY':o.data.size_y if o.data.type=='AREA' else None} for o in s.objects if o.type=='LIGHT'}
 poses={}
 for f in frames:
  s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in s.objects}
 return {'geometry':geometry(),'poses':poses,'materials':materials,'lights':lights,'view':(s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure)}
bpy.ops.wm.open_mainfile(filepath=str(O/d['sourceScene']));before=state()
bpy.ops.wm.open_mainfile(filepath=str(O/d['scene']));after=state();issues=[];maximum=0
if before['geometry']!=after['geometry']:issues.append('Mesh geometry, topology, UV or visibility changed')
if before['materials']!=after['materials']:issues.append('Non-floor material changed')
if before['view']!=after['view']:issues.append('Camera colour management changed')
for f in frames:
 for name,matrix in before['poses'][f].items():
  if name not in d.get('reorientedLights',[]):maximum=max(maximum,max(abs(after['poses'][f][name][i][j]-matrix[i][j]) for i in range(4) for j in range(4)))
if maximum>1e-6:issues.append('Original object/camera transform changed')
allowed={x['name']:x for x in d['lightAdjustments']}
for name,old in before['lights'].items():
 new=after['lights'][name]
 if name in allowed:
  if abs(new['energy']-allowed[name]['afterEnergy'])>1e-5:issues.append('Unexpected energy: '+name)
  if any(new[k]!=old[k] for k in ['type','hidden','size','sizeY']):issues.append('Unexpected light shape/visibility: '+name)
 elif new!=old:issues.append('Unlisted light changed: '+name)
added=set(after['poses'][1])-set(before['poses'][1]);expected={d['newLight']['name']}
if added!=expected:issues.append('Unexpected new object')
room=json.loads((R/'Reference/camera-calibration.json').read_text())['room'];new=bpy.data.objects[d['newLight']['name']]
if new.location.y<=room['backY']:issues.append('New daylight source inside room')
emitter_clearance={}
from mathutils import Vector
for name in d['outsideEmitterCorners']:
 lamp=bpy.data.objects[name];corners=[lamp.matrix_world@Vector((x*lamp.data.size/2,y*lamp.data.size_y/2,0)) for x,y in [(-1,-1),(-1,1),(1,-1),(1,1)]];emitter_clearance[name]=min(p.y-room['backY'] for p in corners)
 if emitter_clearance[name]<.01:issues.append('Emitter plane intrudes through rear wall: '+name)
bpy.context.scene.frame_set(1);floor=bpy.data.objects[floor_name];m=floor.data.materials[0];p=m.node_tree.nodes['Principled BSDF'];maps=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
if len(maps)!=3 or not all(i.packed_file for i in maps):issues.append('Missing packed source maps')
if p.inputs['Metallic'].default_value!=0 or not p.inputs['Coat Normal'].is_linked:issues.append('Floor surface settings differ')
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':d['scene'],'sourceScene':d['sourceScene'],'passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'originalObjects':len(before['poses'][1]),'sampledFrames':frames,'maximumOriginalNonReorientedMatrixChange':maximum,'meshTopologyPositionsUVsVisibilitySha256':after['geometry'],'nonFloorMaterialAssignmentsAndNodesPreserved':len(before['materials']),'originalLightVisibilityPreserved':True,'allowedLightRotations':d.get('reorientedLights',[]),'outsideEmitterMinimumWallClearance':emitter_clearance,'newLightOutside':list(new.location),'changedExistingLights':list(allowed),'floorPackedMaps':len(maps),'priorRouteEvidence':'junction-record-clearance.json','priorEvidenceApplicability':'No mesh, visibility or sampled non-light transform changes. New object is an outside light without collision geometry. Previous sampled route audit remains applicable.','limits':['Exact visual appearance requires image review.','Four sampled original transforms checked; no claim of continuous collision certification.','Not validated in Unreal.']}
(O/'daylight-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('DAYLIGHT_VERIFIED',json.dumps({k:out[k] for k in ['passed','issues','originalObjects','maximumOriginalNonReorientedMatrixChange']}),flush=True)
if issues:raise RuntimeError('; '.join(issues))
