"""Check source leaf shape, rooted placement, room contacts and preserved scene state."""
import bpy,json,datetime,hashlib,struct,math
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review';d=json.loads((O/'plant-pose-study.json').read_text());cal=json.loads((R/'Reference/camera-calibration.json').read_text());frames=(1,109,289,577)
sources={v['sourceObject'] for v in d['changes']};added={v['object'] for v in d['changes']}
def value(v):
 if isinstance(v,(str,int,float,bool)):return v
 try:return list(v)
 except TypeError:return str(v)
def shader(tree):
 if not tree:return None
 return {'nodes':[{'name':n.name,'type':n.type,'inputs':[(s.name,value(s.default_value)) for s in n.inputs if hasattr(s,'default_value')],'settings':{k:value(getattr(n,k)) for k in ['operation','blend_type','space','uv_map','interpolation','extension','clamp','mute'] if hasattr(n,k)},'image':n.image.name if hasattr(n,'image') and n.image else None} for n in sorted(tree.nodes,key=lambda n:n.name)],'links':sorted((l.from_node.name,l.from_socket.name,l.to_node.name,l.to_socket.name) for l in tree.links)}
def mesh_hash(mesh):
 h=hashlib.sha256()
 for v in mesh.vertices:h.update(struct.pack('<3f',*v.co))
 for p in mesh.polygons:h.update(struct.pack('<II',len(p.vertices),p.material_index));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
 for uv in mesh.uv_layers:
  h.update(uv.name.encode())
  for u in uv.data:h.update(struct.pack('<2f',*u.uv))
 for n in mesh.corner_normals:h.update(struct.pack('<3f',*n.vector))
 return h.hexdigest()
def state():
 s=bpy.context.scene;s.frame_set(1);meshes={o.name:mesh_hash(o.data) for o in s.objects if o.type=='MESH' and o.name not in added}
 materials={o.name:[(m.name,shader(m.node_tree)) if m else None for m in o.data.materials] for o in s.objects if o.type=='MESH' and o.name not in added}
 visibility={o.name:(o.hide_render,o.hide_viewport,o.hide_get()) for o in s.objects if o.name not in added|sources}
 lights={o.name:{k:value(getattr(o.data,k)) for k in ['type','energy','color','size','size_y','shape','spot_size','spot_blend','angle'] if hasattr(o.data,k)} for o in s.objects if o.type=='LIGHT'}
 camera={o.name:(o.data.type,o.data.lens,o.data.sensor_width,o.data.clip_start,o.data.clip_end) for o in s.objects if o.type=='CAMERA'}
 poses={}
 for f in frames:
  s.frame_set(f);poses[f]={o.name:o.matrix_world.copy() for o in s.objects if o.name not in added}
 return {'geometry':meshes,'materials':materials,'visibility':visibility,'lights':lights,'world':shader(s.world.node_tree),'camera':camera,'view':(s.view_settings.view_transform,s.view_settings.look,s.view_settings.exposure),'poses':poses}
bpy.ops.wm.open_mainfile(filepath=str(O/d['sourceScene']));before=state()
bpy.ops.wm.open_mainfile(filepath=str(O/d['scene']));after=state();s=bpy.context.scene;issues=[];maximum=0
for k in before:
 if k!='poses' and before[k]!=after[k]:issues.append('Unexpected original change: '+k)
for f in frames:
 if before['poses'][f].keys()!=after['poses'][f].keys():issues.append('Original inventory differs');continue
 for n,m in before['poses'][f].items():maximum=max(maximum,max(abs(after['poses'][f][n][i][j]-m[i][j]) for i in range(4) for j in range(4)))
if maximum>1e-6:issues.append('Original poses differ')
s.frame_set(1);bpy.context.view_layer.update();shape=[];root_checks=[]
for change in d['changes']:
 a=bpy.data.objects[change['sourceObject']];b=bpy.data.objects[change['object']]
 if not a.hide_render or b.hide_render:issues.append('Source/new visibility incorrect')
 if [tuple(p.vertices) for p in a.data.polygons]!=[tuple(p.vertices) for p in b.data.polygons]:issues.append('Leaf topology changed')
 for u,v in zip(a.data.uv_layers,b.data.uv_layers):
  if u.name!=v.name or any((p.uv-q.uv).length>1e-7 for p,q in zip(u.data,v.data)):issues.append('Source leaf UV changed')
 covered=[];vertex_error=0;root_error=0;uniform_error=0;normal_matrices={}
 for component in change['components']:
  m=Matrix(component['matrix']);root=Vector(component['rootLocal']);scale=component['uniformScale'];uniform_error=max(uniform_error,max(abs(m.to_3x3().col[i].length-scale) for i in range(3)))
  root_error=max(root_error,(m@root-root).length)
  for index in component['indices']:
   covered.append(index);vertex_error=max(vertex_error,(m@a.data.vertices[index].co-b.data.vertices[index].co).length)
   normal_matrices[index]=m.to_3x3().inverted().transposed()
  root_checks.append(b.matrix_world@root)
 if sorted(covered)!=list(range(len(a.data.vertices))):issues.append('Incomplete or duplicated component coverage')
 if vertex_error>1e-4 or root_error>1e-4 or uniform_error>1e-5:issues.append('Rigid uniform component transform check failed')
 normal_error=max(((normal_matrices[loop.vertex_index]@a.data.corner_normals[loop.index].vector).normalized()-b.data.corner_normals[loop.index].vector).length for loop in a.data.loops)
 if normal_error>.002:issues.append('Authored leaf normals did not follow component pose')
 if [(m.name,shader(m.node_tree)) for m in a.data.materials]!=[(m.name,shader(m.node_tree)) for m in b.data.materials]:issues.append('Leaf materials changed')
 shape.append({'object':b.name,'completeComponents':len(change['components']),'maxLocalVertexError':vertex_error,'maxLocalRootError':root_error,'maxUniformScaleError':uniform_error,'maxRotatedCornerNormalVectorError':normal_error,'topologyAndUVRetained':True})
plants=[bpy.data.objects[n] for n in added];points=[o.matrix_world@v.co for o in plants for v in o.data.vertices];lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
if hi.y>=cal['room']['backY']-.02 or lo.x<=cal['room']['leftX'] or lo.z<0:issues.append('Plant leaves exit room')
drum=bpy.data.objects['Detail / chrome petrol drum planter'];dp=[drum.matrix_world@v.co for v in drum.data.vertices];dlo=Vector([min(p[i] for p in dp) for i in range(3)]);dhi=Vector([max(p[i] for p in dp) for i in range(3)])
if abs(dlo.z)>1e-6:issues.append('Drum no longer on floor')
def bvh(obs):
 vertices=[];tris=[]
 for o in obs:
  m=o.data;m.calc_loop_triangles();base=len(vertices);vertices.extend(o.matrix_world@v.co for v in m.vertices);tris.extend(tuple(base+i for i in t.vertices) for t in m.loop_triangles)
 return BVHTree.FromPolygons(vertices,tris,all_triangles=True)
contacts=[];tree=bvh(plants)
for o in s.objects:
 if o.type!='MESH' or o.hide_render or o.name in added:continue
 ps=[o.matrix_world@Vector(c) for c in o.bound_box];a=Vector([min(p[i] for p in ps) for i in range(3)]);b=Vector([max(p[i] for p in ps) for i in range(3)])
 if any(b[i]<lo[i] or a[i]>hi[i] for i in range(3)):continue
 hits=len(tree.overlap(bvh([o])))
 contacts.append({'object':o.name,'triangleIntersections':hits})
 if hits:issues.append('Plant intersects '+o.name)
out={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':d['scene'],'passed':not issues,'issues':issues,'unrealSceneBuilt':False,'userApproved':False,'originalObjects':len(before['poses'][1]),'sampledFrames':frames,'maximumOriginalMatrixChange':maximum,'originalMeshesMaterialsLightsCamerasRetained':all(before[k]==after[k] for k in before if k!='poses'),'sourceLeafShapeChecks':shape,'floorPlantBounds':[list(lo),list(hi)],'backWallClearance':cal['room']['backY']-hi.y,'drumFloorGap':dlo.z,'nearbyGeometryContacts':contacts,'limits':['This verifies source-preserving component posing and geometric contacts, not an exact botanical or visual match.','Full LP routes checked separately.','Four animation poses are samples, not a continuous proof.']}
(O/'plant-pose-verification.json').write_text(json.dumps(out,indent=2)+'\n');print('PLANT_POSE_VERIFIED',json.dumps(out),flush=True)
if issues:raise RuntimeError('; '.join(issues))
