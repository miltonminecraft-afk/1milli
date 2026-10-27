"""Check intact source reuse, preservation and contacts in the hanging-plant study."""
import bpy,bmesh,json,datetime,hashlib,struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review'
d=json.loads((O/'hanging-plant-study.json').read_text());added={p['object'] for p in d['placements']};frames=(1,109,289,577)
def value(v):
    if isinstance(v,(str,int,float,bool)):return v
    try:return list(v)
    except TypeError:return str(v)
def shader(tree):
    if not tree:return None
    return {'nodes':[{'name':n.name,'type':n.type,'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],'settings':{k:value(getattr(n,k)) for k in ['operation','blend_type','space','uv_map','interpolation','extension','clamp','mute'] if hasattr(n,k)},'image':n.image.name if hasattr(n,'image') and n.image else None} for n in sorted(tree.nodes,key=lambda n:n.name)],'links':sorted((l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links)}
def mesh_hash(m):
    h=hashlib.sha256()
    for v in m.vertices:h.update(struct.pack('<3f',*v.co))
    for p in m.polygons:h.update(struct.pack('<II',len(p.vertices),p.material_index));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    for u in m.uv_layers:
        h.update(u.name.encode())
        for p in u.data:h.update(struct.pack('<2f',*p.uv))
    for n in m.corner_normals:h.update(struct.pack('<3f',*n.vector))
    return h.hexdigest()
def state():
    s=bpy.context.scene;s.frame_set(1);objects=[o for o in s.objects if o.name not in added]
    poses={}
    for f in frames:s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in objects}
    return {'poses':poses,'geometry':{o.name:mesh_hash(o.data) for o in objects if o.type=='MESH'},'materials':{o.name:[(m.name,shader(m.node_tree)) if m else None for m in o.data.materials] for o in objects if o.type=='MESH'},'visibility':{o.name:(o.hide_render,o.hide_viewport,o.hide_get()) for o in objects},'lights':{o.name:{k:value(getattr(o.data,k)) for k in ['type','energy','color','size','size_y','shape','spot_size','spot_blend','angle'] if hasattr(o.data,k)} for o in objects if o.type=='LIGHT'},'camera':{o.name:(o.data.type,o.data.lens,o.data.sensor_width,o.data.clip_start,o.data.clip_end) for o in objects if o.type=='CAMERA'},'world':shader(s.world.node_tree),'view':(s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure)}
bpy.ops.wm.open_mainfile(filepath=str(O/d['sourceScene']));before=state()
bpy.ops.wm.open_mainfile(filepath=str(O/d['scene']));after=state();s=bpy.context.scene;s.frame_set(1);issues=[]
for k in before:
    if k!='poses' and before[k]!=after[k]:issues.append('Original changed: '+k)
error=0
for f in frames:
    if before['poses'][f].keys()!=after['poses'][f].keys():issues.append('Original inventory changed');continue
    for n,m in before['poses'][f].items():error=max(error,max(abs(m[i][j]-after['poses'][f][n][i][j]) for i in range(4) for j in range(4)))
if error>1e-6:issues.append('Original pose changed')
a=bpy.data.objects[d['sourceObject']].data;b=bpy.data.objects[d['placements'][0]['object']].data
indices=d['sourceVertexIndices'];mapping={n:i for i,n in enumerate(indices)};chosen=set(indices)
vertex_error=max((a.vertices[n].co-b.vertices[i].co).length for i,n in enumerate(indices))
if vertex_error>1e-7:issues.append('Source vertex position changed')
if any(any(i in chosen for i in p.vertices) and not all(i in chosen for i in p.vertices) for p in a.polygons):issues.append('Source face cut')
for p,old in zip(b.polygons,d['sourcePolygonIndices']):
    q=a.polygons[old]
    if tuple(p.vertices)!=tuple(mapping[i] for i in q.vertices) or p.material_index!=q.material_index:issues.append('Source topology/material index changed')
uv_error=max((new.data[i].uv-old.data[j].uv).length for old,new in zip(a.uv_layers,b.uv_layers) for i,j in enumerate(d['sourceLoopIndices']))
normal_error=max((b.corner_normals[i].vector-a.corner_normals[j].vector).length for i,j in enumerate(d['sourceLoopIndices']))
if uv_error>1e-7 or normal_error>.002:issues.append('Source UV/normals changed')
if list(a.materials)!=list(b.materials):issues.append('Source materials changed')
# A complete connected component must be kept or omitted in its entirety.
bm=bmesh.new();bm.from_mesh(a);bm.verts.ensure_lookup_table();kept={bm.verts[i] for i in indices}
if any((e.verts[0] in kept)!=(e.verts[1] in kept) for e in bm.edges):issues.append('Connected component cut')
bm.free()
def bvh(objects):
    vs=[];ts=[]
    for o in objects:
        o.data.calc_loop_triangles();base=len(vs);vs.extend(o.matrix_world@v.co for v in o.data.vertices);ts.extend(tuple(base+i for i in t.vertices) for t in o.data.loop_triangles)
    return BVHTree.FromPolygons(vs,ts,all_triangles=True)
new_objects=[bpy.data.objects[n] for n in added];tree=bvh(new_objects)
points=[o.matrix_world@v.co for o in new_objects for v in o.data.vertices];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
contacts=[]
for o in s.objects:
    if o.type!='MESH' or o.hide_render or o.name in added:continue
    ps=[o.matrix_world@Vector(c) for c in o.bound_box];aabb=[Vector([f(p[i] for p in ps) for i in range(3)]) for f in (min,max)]
    if any(aabb[1][i]<lo[i] or aabb[0][i]>hi[i] for i in range(3)):continue
    hits=len(tree.overlap(bvh([o])));allowed='raised wall plant / POTHOS_' in o.name
    contacts.append({'object':o.name,'intersections':hits,'expectedCanopyOverlap':allowed})
    if hits and not allowed:issues.append('Vine intersects '+o.name)
joins=[];roots=[];canopy=bvh([o for o in s.objects if 'raised wall plant / POTHOS_' in o.name and not o.hide_render])
for p in d['placements']:
    o=bpy.data.objects[p['object']];root=o.matrix_world@Vector(d['rootLocal']);tip=o.matrix_world@Vector(d['tipLocal'])
    scales=[o.matrix_world.to_3x3().col[i].length for i in range(3)]
    if max(scales)-min(scales)>1e-6:issues.append('Nonuniform branch scale')
    if p['number']==1:
        near=canopy.find_nearest(root);distance=near[3] if near else 999;roots.append({'object':o.name,'distanceToSourceCanopy':distance})
        if distance>.12:issues.append('Floating root: '+o.name)
    else:
        previous=next(q for q in d['placements'] if q['chain']==p['chain'] and q['number']==p['number']-1)
        end=bpy.data.objects[previous['object']].matrix_world@Vector(d['tipLocal']);gap=(root-end).length;joins.append({'object':o.name,'stemJoinGap':gap})
        if gap>1e-6:issues.append('Stem join gap')
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':d['scene'],'passed':not issues,'issues':issues,'originalObjects':len(before['poses'][1]),'originalStateRetained':all(before[k]==after[k] for k in before if k!='poses'),'maximumOriginalMatrixChange':error,'sampledFrames':frames,'sourceComponents':len(d['sourceComponents']),'verticesPerInstance':len(indices),'sourceVertexError':vertex_error,'sourceUVError':uv_error,'sourceCornerNormalError':normal_error,'completeSourceComponents':True,'bounds':[list(lo),list(hi)],'contacts':contacts,'roots':roots,'stemJoins':joins,'unrealSceneBuilt':False,'userApproved':False,'limits':['No exact visual-match claim.','Existing canopy overlap is expected at the vine roots.','LP routes checked separately.']}
(O/'hanging-plant-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('HANGING_PLANT_CHECK',json.dumps(out),flush=True)
if issues:raise RuntimeError('; '.join(issues))
