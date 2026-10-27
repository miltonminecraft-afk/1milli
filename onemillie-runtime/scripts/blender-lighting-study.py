"""Re-openable lighting study using only the selected imported models.
Run Blender --background --python this-file.py -- <runtime-root>.
This does not replace the web environment or bake a final chosen room.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Matrix, Vector, Euler
root=Path(sys.argv[sys.argv.index('--')+1]).resolve()
config=json.loads((root/'public/assets/room.json').read_text())
output=root/'onemillie/review/blender'
output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1280
scene.render.resolution_y=800
scene.render.resolution_percentage=75
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0
basis=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def vector(values):
    return basis.to_3x3() @ Vector(values)
def import_prop(item):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(root/'public'/item['url'].lstrip('/')))
    added=set(bpy.data.objects)-before
    parent=bpy.data.objects.new(item.get('name','Scanned environment'),None)
    scene.collection.objects.link(parent)
    for obj in added:
        if obj.parent not in added: obj.parent=parent
    t=item.get('transform',{})
    rotation=Euler(tuple(math.radians(t.get(k,0)) for k in ('rx','ry','rz')),'XYZ').to_quaternion()
    s=t.get('scale',1)
    matrix=Matrix.LocRotScale(Vector(tuple(t.get(k,0) for k in ('x','y','z'))),rotation,Vector((s,s,s)))
    parent.matrix_world=basis @ matrix @ basis.inverted()
import_prop(config['environment'])
for item in config['props']:
    if item['id']!='base-vinyl': import_prop(item)
world=bpy.data.worlds.new('Soft warehouse daylight')
scene.world=world
world.use_nodes=True
nodes=world.node_tree.nodes
environment=nodes.new('ShaderNodeTexEnvironment')
environment.image=bpy.data.images.load(str(root/'public/assets/warehouse-lighting.hdr'))
world.node_tree.links.new(environment.outputs['Color'],nodes.get('Background').inputs['Color'])
nodes.get('Background').inputs['Strength'].default_value=.25
def area(name,location,target,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=vector(location)
    obj.rotation_euler=(vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
area('Broad window daylight',[-2.5,2.6,-1.4],[-.7,.9,-3.8],350,2.5,(.88,.94,1))
area('Pendant soft pool',[0,3.65,-2],[0,0,-2],110,.65,(1,.79,.56))
area('Window bounce',[1.8,2.5,1.6],[-1,.8,-3.8],160,3,(.91,.96,1))
camera_data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
view=config['views']['overview'];camera.location=vector(view['position']);camera.rotation_euler=(vector(view['target'])-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.lens=25
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(output/'lighting-study.png')
# External images remain linked to the existing workspace, avoiding duplicated 8K files.
bpy.ops.wm.save_as_mainfile(filepath=str(output/'lighting-study.blend'))
bpy.ops.render.render(write_still=True)
print('LIGHTING_STUDY_READY',str(output))
