"""Add a soft warm key light aimed at the record cabinet; preserve the room."""
import bpy,json,datetime,math,sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];O=R/'Review'
name='Detail / cabinet warm key'
position=(-1.60,2.40,2.40);target=(-3.10,3.65,1.25)
pairs=[('reference-walls.blend','reference-cabinet-light.blend'),('reference-hanging-plant.blend','reference-hanging-light.blend')]
for source,destination in pairs:
    bpy.ops.wm.open_mainfile(filepath=str(O/source));s=bpy.context.scene;s.frame_set(1)
    assert name not in bpy.data.objects
    light=bpy.data.lights.new(name,'AREA');light.energy=28;light.shape='RECTANGLE'
    light.size=1.4;light.size_y=1.8;light.color=(1,.78,.56);light.spread=math.radians(65)
    o=bpy.data.objects.new(name,light);s.collection.objects.link(o);o.location=position
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    o['purpose']='Soft warm directional fill onto record sleeves and cabinet containers.'
    s.camera=bpy.data.objects['Reference camera / fitted']
    s['status']='Blender review with cabinet lighting; still an unfinished room, not Unreal.'
    bpy.ops.wm.save_as_mainfile(filepath=str(O/destination))
report={'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scene':pairs[0][1],'sourceScene':pairs[0][0],'internalScene':pairs[1][1],'internalSourceScene':pairs[1][0],'newLight':{'name':name,'type':'AREA','shape':'RECTANGLE','position':list(position),'target':list(target),'powerWatts':28,'size':[1.4,1.8],'colorLinearRGB':[1,.78,.56],'spreadDegrees':65},'geometryChanged':False,'worldOrExposureChanged':False,'unrealSceneBuilt':False,'userApprovedFinalScene':False,'note':'Only one built-in light added to the shown wall review. Same light carried to the internal plant study without changing its meshes.'}
(O/'cabinet-light-study.json').write_text(json.dumps(report,indent=2)+'\n')
print('CABINET_LIGHT_SAVED',json.dumps(report),flush=True)
if '--no-render' not in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(O/pairs[0][1]));s=bpy.context.scene;s.frame_set(1)
    s.render.resolution_percentage=60;s.cycles.samples=64
    for file,camera in [('reference-cabinet-light.png','Reference camera / fitted'),('cabinet-light-storage.png','Storage detail camera'),('cabinet-light-workbench.png','Workbench camera / same room')]:
        s.camera=bpy.data.objects[camera];s.render.filepath=str(O/file);bpy.ops.render.render(write_still=True)
        print('CABINET_LIGHT_RENDERED',file,flush=True)
