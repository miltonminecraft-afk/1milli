"""Verify a single new cabinet light without changing original room state."""
import bpy,json,hashlib,struct,datetime,math
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'Review'
d=json.loads((O/'cabinet-light-study.json').read_text());new_name=d['newLight']['name'];frames=(1,109,289,577)
def value(v):
    if isinstance(v,(str,int,float,bool)):return v
    try:return list(v)
    except TypeError:return str(v)
def shader(tree):
    if not tree:return None
    return {'nodes':[{'name':n.name,'type':n.type,'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],'settings':{k:value(getattr(n,k)) for k in ['operation','blend_type','space','uv_map','interpolation','extension','clamp','mute'] if hasattr(n,k)},'image':n.image.name if hasattr(n,'image') and n.image else None} for n in sorted(tree.nodes,key=lambda n:n.name)],'links':sorted((l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links)}
def geometry(objects):
    h=hashlib.sha256()
    for o in sorted(objects,key=lambda o:o.name):
        if o.type!='MESH':continue
        m=o.data;h.update(o.name.encode())
        for v in m.vertices:h.update(struct.pack('<3f',*v.co))
        for p in m.polygons:h.update(struct.pack('<II',len(p.vertices),p.material_index));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
        for u in m.uv_layers:
            h.update(u.name.encode())
            for p in u.data:h.update(struct.pack('<2f',*p.uv))
        for n in m.corner_normals:h.update(struct.pack('<3f',*n.vector))
    return h.hexdigest()
def state():
    s=bpy.context.scene;s.frame_set(1);objects=[o for o in s.objects if o.name!=new_name];poses={}
    for f in frames:s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in objects}
    return {'poses':poses,'geometry':geometry(objects),'materials':{o.name:[(m.name,shader(m.node_tree)) if m else None for m in o.data.materials] for o in objects if o.type=='MESH'},'visibility':{o.name:(o.hide_render,o.hide_viewport,o.hide_get()) for o in objects},'lights':{o.name:{k:value(getattr(o.data,k)) for k in ['type','energy','color','size','size_y','shape','spot_size','spot_blend','angle','spread','use_shadow'] if hasattr(o.data,k)} for o in objects if o.type=='LIGHT'},'camera':{o.name:(o.data.type,o.data.lens,o.data.sensor_width,o.data.clip_start,o.data.clip_end) for o in objects if o.type=='CAMERA'},'world':shader(s.world.node_tree),'view':(s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure)}
reports=[];room=json.loads((R/'Reference/camera-calibration.json').read_text())['room']
for source,destination,prior in [(d['sourceScene'],d['scene'],'junction-record-clearance.json'),(d['internalSourceScene'],d['internalScene'],'hanging-plant-record-clearance.json')]:
    bpy.ops.wm.open_mainfile(filepath=str(O/source));before=state()
    bpy.ops.wm.open_mainfile(filepath=str(O/destination));after=state();s=bpy.context.scene;s.frame_set(1);issues=[]
    for k in before:
        if k!='poses' and before[k]!=after[k]:issues.append('Original changed: '+k)
    maximum=0
    for f in frames:
        if before['poses'][f].keys()!=after['poses'][f].keys():issues.append('Original inventory differs');continue
        for n,m in before['poses'][f].items():maximum=max(maximum,max(abs(m[i][j]-after['poses'][f][n][i][j]) for i in range(4) for j in range(4)))
    if maximum>1e-6:issues.append('Original pose changed')
    if set(o.name for o in s.objects)-set(before['poses'][1])!={new_name}:issues.append('Unexpected added object')
    o=bpy.data.objects[new_name];light=o.data
    if light.type!='AREA' or light.shape!='RECTANGLE' or o.hide_render or not light.use_shadow:issues.append('Invalid light type/visibility/shadows')
    for actual,expected in [(light.energy,d['newLight']['powerWatts']),(light.size,d['newLight']['size'][0]),(light.size_y,d['newLight']['size'][1]),(light.spread,math.radians(d['newLight']['spreadDegrees']))]:
        if abs(actual-expected)>1e-5:issues.append('Light settings differ')
    if any(abs(a-b)>1e-5 for a,b in zip(light.color,d['newLight']['colorLinearRGB'])):issues.append('Light color differs')
    corners=[o.matrix_world@Vector((x*light.size/2,y*light.size_y/2,0)) for x,y in [(-1,-1),(-1,1),(1,-1),(1,1)]]
    if not all(room['leftX']<p.x<room['rightX'] and 0<p.y<room['backY'] and 0<p.z<room['height'] for p in corners):issues.append('Emitter exits room')
    facing=(o.matrix_world.to_3x3()@Vector((0,0,-1))).normalized();alignment=facing.dot((Vector(d['newLight']['target'])-o.location).normalized())
    if alignment<.99999:issues.append('Light misses cabinet target')
    reports.append({'sourceScene':source,'scene':destination,'passed':not issues,'issues':issues,'originalObjects':len(before['poses'][1]),'sampledFrames':frames,'maximumOriginalMatrixChange':maximum,'meshGeometryTopologyUVNormalSha256':after['geometry'],'originalMaterialsLightsCamerasWorldExposureRetained':all(before[k]==after[k] for k in before if k!='poses'),'newObject':new_name,'targetDirectionDot':alignment,'emitterCorners':[list(p) for p in corners],'priorRecordRouteEvidence':prior,'priorRouteEvidenceApplies':'No mesh, visibility, or sampled original transform changed; the only addition is a light with no collision geometry.'})
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':all(r['passed'] for r in reports),'scenes':reports,'unrealSceneBuilt':False,'finalSceneApproved':False,'limits':['Visual brightness and atmosphere checked using rendered images.','Four original animation samples; not a continuous collision proof.','Light settings have not been validated in Unreal.']}
(O/'cabinet-light-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('CABINET_LIGHT_VERIFIED',json.dumps({k:out[k] for k in ['passed','scenes']}),flush=True)
if not out['passed']:raise RuntimeError('Cabinet lighting verification failed')
