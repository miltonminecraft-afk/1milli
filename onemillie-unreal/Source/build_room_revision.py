"""User-directed dark masonry, worn floor, intact foreground foliage and clutter."""
import bpy,json,math,datetime,sys
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];O=R/'Review';M=R/'Materials'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-hanging-light.blend'));s=bpy.context.scene;s.frame_set(1)
original={o.name:o.matrix_world.copy() for o in s.objects};added=[];hidden=[]
def bounds(obs):
    points=[o.matrix_world@v.co for o in obs for v in o.data.vertices]
    return [Vector([f(p[i] for p in points) for i in range(3)]) for f in (min,max)]
def clone_group(obs,role,xy,z,size,yaw=0):
    new=[]
    for i,old in enumerate(obs):
        o=old.copy();o.data=old.data.copy();o.animation_data_clear();s.collection.objects.link(o);o.parent=None;o.data.transform(old.matrix_world);o.matrix_world=Matrix.Identity(4);o.name=f'Detail / room revision / {role} / {i+1}';new.append(o)
    a,b=bounds(new);pivot=Vector(((a.x+b.x)/2,(a.y+b.y)/2,a.z));scale=size/max(b-a)
    mat=Matrix.Translation(Vector((*xy,z)))@Matrix.Rotation(math.radians(yaw),4,'Z')@Matrix.Scale(scale,4)@Matrix.Translation(-pivot)
    for o in new:o.matrix_world=mat
    a,b=bounds(new);added.append({'role':role,'objects':[o.name for o in new],'sourceObjects':[o.name for o in obs],'uniformScale':scale,'yaw':yaw,'bounds':[list(a),list(b)],'supportZ':z})
    return new
def texture(nodes,links,source,folder,channel,uv):
    data=source['maps'][channel];im=bpy.data.images.load(str(folder/data['file']),check_existing=True);im.colorspace_settings.name='sRGB' if channel=='diff' else 'Non-Color';im.pack()
    n=nodes.new('ShaderNodeTexImage');n.image=im;n.extension='REPEAT';links.new(uv,n.inputs['Vector']);return n
# New scanned granular mineral finish; no wood fibres or invented panel pattern.
source=json.loads((M/'wall-candidates/rough_concrete-maps.json').read_text());mat=bpy.data.materials.new('Revision / dark granular stone wall');mat.use_nodes=True
n=mat.node_tree.nodes;l=mat.node_tree.links;p=n['Principled BSDF'];uv=n.new('ShaderNodeUVMap');uv.uv_map='ReferenceWallUV'
diff=texture(n,l,source,M/'wall-candidates','diff',uv.outputs['UV']);normal=texture(n,l,source,M/'wall-candidates','normal',uv.outputs['UV']);rough=texture(n,l,source,M/'wall-candidates','rough',uv.outputs['UV'])
tint=n.new('ShaderNodeHueSaturation');tint.inputs['Saturation'].default_value=.12;tint.inputs['Value'].default_value=.25;l.new(diff.outputs['Color'],tint.inputs['Color']);l.new(tint.outputs['Color'],p.inputs['Base Color'])
nm=n.new('ShaderNodeNormalMap');nm.uv_map=uv.uv_map;nm.inputs['Strength'].default_value=.7;l.new(normal.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
rr=n.new('ShaderNodeMapRange');rr.inputs['To Min'].default_value=.72;rr.inputs['To Max'].default_value=.95;l.new(rough.outputs['Color'],rr.inputs['Value']);l.new(rr.outputs['Result'],p.inputs['Roughness']);mat['source_url']=source['source'];mat['license']=source['license']
wall_names=[r['object'] for r in json.loads((O/'walls-study.json').read_text())['changedWalls']]
if 'Architecture / ceiling' in bpy.data.objects:wall_names.append('Architecture / ceiling')
for name in wall_names:
    o=bpy.data.objects[name];o.data.materials.clear();o.data.materials.append(mat)
    layer=o.data.uv_layers.get('ReferenceWallUV') or o.data.uv_layers.new(name='ReferenceWallUV');normals=o.matrix_world.to_3x3().inverted().transposed()
    for face in o.data.polygons:
        face.material_index=0;axis=max(range(3),key=lambda i:abs((normals@face.normal)[i]));pair=(1,2) if axis==0 else ((0,2) if axis==1 else (0,1))
        for j in face.loop_indices:
            q=o.matrix_world@o.data.vertices[o.data.loops[j].vertex_index].co;layer.data[j].uv=(q[pair[0]]/1.5,q[pair[1]]/1.5)
# Scanned cracks and stains, retaining the sealed floor's reflection settings.
floor=bpy.data.objects['Architecture / floor'];fm=floor.data.materials[0].copy();floor.data.materials[0]=fm;fm.name='Revision / stained cracked stone floor';n=fm.node_tree.nodes;l=fm.node_tree.links;p=n['Principled BSDF'];floor_source=json.loads((M/'floor-candidates/cracked_concrete-maps.json').read_text())
mapping=next(x for x in n if x.type=='VECT_MATH' and x.operation=='SCALE');mapping.inputs[3].default_value=3/2.8
for channel in ['diff','normal','rough']:
    target=n['Scanned cement / '+channel];data=floor_source['maps'][channel];im=bpy.data.images.load(str(M/'floor-candidates'/data['file']),check_existing=True);im.colorspace_settings.name='sRGB' if channel=='diff' else 'Non-Color';im.pack();target.image=im
n['Neutral concrete colour'].inputs['Saturation'].default_value=.25;n['Concrete albedo adjustment'].inputs[2].default_value=(1.15,1.12,1.10,1)
next(x for x in n if x.type=='NORMAL_MAP').inputs['Strength'].default_value=.65
fm['source_url']=floor_source['source'];fm['license']=floor_source['license']
# Reuse complete licensed crate assemblies with a little variation in position/yaw.
dressing=json.loads((O/'dressing-study.json').read_text());case=lambda k:[bpy.data.objects[x] for x in dressing['containers'][k-1]['objects']]
deck=.1778
clone_group(case(3),'under table back case',(-2.52,5.91),deck,.49,7)
clone_group(case(7),'under table open case',(-1.95,5.84),deck,.41,-8)
# Space at the left of the lower deck is reserved for the requested PC.
clone_group(case(8),'crate beside workbench',(.43,3.52),.0003,.54,5)
level=.0003
for i,(yaw,offset) in enumerate([(-4,0),(5,.015),(-3,-.008)]):
    obs=clone_group(case(9 if i<2 else 10),f'left foreground case {i+1}',(-3.13+offset,2.56),level,.37,yaw);level=bounds(obs)[1].z+.001
pens=[o for o in s.objects if o.name.startswith('Detail / workbench pencil cup /') and o.type=='MESH'];paper=[o for o in s.objects if o.name.startswith('Detail / folded newspaper /') and o.type=='MESH'];tape=[o for o in s.objects if 'Detail / arranged bench prop / Duct_Tape_' in o.name]
clone_group(pens,'music table pen cup',(-2.81,5.49),.89771,.23,-10)
clone_group(paper,'music table paper',(-2.68,5.80),.89771,.28,13)
clone_group(tape,'music table tape',(-2.79,5.68),.89771,.075,-15)
clone_group(paper,'paper on rear case',(-2.49,5.92),deck+.49/.355*.23+.001,.22,-12)
# Intact branch components replace the older fragments cut by a height threshold.
for o in list(s.objects):
    if o.name.startswith(('Detail / foreground trailing extension','Detail / foreground trailing filler')):o.hide_render=True;o.hide_set(True);hidden.append(o.name)
plant=json.loads((O/'hanging-plant-study.json').read_text());branch=bpy.data.objects[plant['placements'][0]['object']].data;root=Vector(plant['rootLocal']);tip=Vector(plant['tipLocal'])
for chain,anchor,scales,yaws in [('front',(-3.10,2.82,2.60),(.9,.9,.85,.70),(180,0,180,0)),('edge',(-3.23,2.84,2.63),(.65,.65,.60),(170,5,175))]:
    anchor=Vector(anchor)
    for i,(scale,yaw) in enumerate(zip(scales,yaws)):
        o=bpy.data.objects.new(f'Detail / room revision / foreground vine {chain} {i+1}',branch);s.collection.objects.link(o);o.matrix_world=Matrix.Translation(anchor)@Matrix.Rotation(math.radians(yaw),4,'Z')@Matrix.Scale(scale,4)@Matrix.Translation(-root);end=o.matrix_world@tip
        added.append({'role':'foreground vine','objects':[o.name],'sourceObject':plant['placements'][0]['object'],'uniformScale':scale,'stemRoot':list(anchor),'stemTip':list(end)});anchor=end
s.camera=bpy.data.objects['Reference camera / fitted'];s['status']='User-directed room revision: dark mineral walls, worn floor, clutter and cabinet lighting. Blender work version; not Unreal.'
bpy.context.view_layer.update();assert max(abs(o.matrix_world[i][j]-original[o.name][i][j]) for o in s.objects if o.name in original for i in range(4) for j in range(4))<1e-6
bpy.ops.wm.save_as_mainfile(filepath=str(O/'reference-room-revision.blend'))
report={'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceScene':'reference-hanging-light.blend','scene':'reference-room-revision.blend','wallSource':source,'floorSource':floor_source,'changedWallObjects':wall_names,'added':added,'hiddenOriginalFoliage':hidden,'unrealSceneBuilt':False,'finalDesignApproved':False,'pending':['Computer, monitor and connecting cables.','LP clearance and placement review.','Visual comparison and website update.']}
(O/'room-revision-study.json').write_text(json.dumps(report,indent=2)+'\n');print('ROOM_REVISION_SAVED',len(added),flush=True)
if '--no-render' not in sys.argv:
    s.render.resolution_percentage=60;s.cycles.samples=48;s.render.filepath=str(O/'reference-room-revision.png');bpy.ops.render.render(write_still=True)
