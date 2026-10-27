"""Place complete licensed computer components and editable audio cable curves."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];O=R/'Review';bpy.ops.wm.open_mainfile(filepath=str(O/'reference-room-revision.blend'));s=bpy.context.scene;s.frame_set(1);report=[]
def bounds(obs):
    ps=[o.matrix_world@v.co for o in obs for v in o.data.vertices]
    return [Vector([f(p[i] for p in ps) for i in range(3)]) for f in (min,max)]
def import_parts(file,select,role,xy,z,height=None,width=None,yaw=0):
    old=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(R/'Import/reference-details'/file));all_new=set(bpy.data.objects)-old
    chosen=[o for o in all_new if o.type=='MESH' and select(o.name)]
    source=[o.name for o in chosen]
    for o in chosen:
        m=o.matrix_world.copy();o.parent=None;o.data=o.data.copy();o.data.transform(m);o.matrix_world=Matrix.Identity(4);o.name=f'Detail / computer / {role} / {o.name}'
    for o in all_new-set(chosen):bpy.data.objects.remove(o,do_unlink=True)
    a,b=bounds(chosen);scale=height/(b.z-a.z) if height else width/(b.x-a.x);pivot=Vector(((a.x+b.x)/2,(a.y+b.y)/2,a.z))
    transform=Matrix.Translation(Vector((*xy,z)))@Matrix.Rotation(math.radians(yaw),4,'Z')@Matrix.Scale(scale,4)@Matrix.Translation(-pivot)
    for o in chosen:o.matrix_world=transform
    report.append({'role':role,'sourceFile':file,'sourceParts':source,'objects':[o.name for o in chosen],'uniformScale':scale,'supportZ':z,'bounds':[list(v) for v in bounds(chosen)]})
    return chosen
tower=import_parts('desktop-tower.glb',lambda name:127<=int(name.split('_')[-1].split('.')[0])<=144,'tower',(-2.99,5.37),.1778,height=.47,yaw=180)
monitor=import_parts('desktop-computer.glb',lambda name:name in ['defaultMaterial.002','defaultMaterial.003','defaultMaterial.004'],'black flatscreen on foot',(-2.64,6.03),.89771,width=.48,yaw=25)
# Preserve the source housing and textures; the display is switched off.
screen=bpy.data.materials.new('Computer / dark glass display');screen.use_nodes=True;p=screen.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.009,.014,.017,1);p.inputs['Roughness'].default_value=.22
for o in monitor:
    if o.name.endswith('.004'):
        o.data.materials.append(screen)
        for f in o.data.polygons:
            if f.area>.1 and f.normal.y<-.5:f.material_index=len(o.data.materials)-1
rubber=bpy.data.materials.new('Audio / black cable rubber');rubber.use_nodes=True;p=rubber.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.006,.008,.009,1);p.inputs['Roughness'].default_value=.65
def cable(name,points,radius=.0032):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,v in zip(sp.bezier_points,points):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new('Detail / audio cable / '+name,c);s.collection.objects.link(o);c.materials.append(rubber)
    report.append({'role':name,'object':o.name,'path':[list(v) for v in points],'radius':radius})
# Routes rest on the tabletop behind the deck, with slack. Endpoints enter rear housings.
cable('left speaker to turntable',[(-3.225,5.29,1.04),(-3.19,5.41,.92),(-3.05,5.49,.902),(-2.85,5.58,.902),(-2.61,5.53,.902),(-2.48,5.47,.912),(-2.43,5.441,.95)])
cable('right speaker to turntable',[(-2.07,6.16,1.04),(-2.15,6.24,.925),(-2.31,6.21,.902),(-2.34,5.95,.902),(-2.19,5.72,.902),(-2.13,5.57,.902),(-2.19,5.47,.915),(-2.20,5.441,.95)])
cable('monitor to PC',[(-2.65,6.10,1.10),(-2.82,6.27,.94),(-2.95,6.31,.89),(-3.05,6.33,.72),(-3.13,6.22,.48),(-3.08,5.85,.39),(-2.98,5.68,.40)])
bpy.ops.wm.save_as_mainfile(filepath=str(O/'reference-computer.blend'));(O/'computer-placement.json').write_text(json.dumps(report,indent=2)+'\n')
s.render.resolution_percentage=60;s.cycles.samples=48;s.render.filepath=str(O/'reference-computer.png');bpy.ops.render.render(write_still=True)
