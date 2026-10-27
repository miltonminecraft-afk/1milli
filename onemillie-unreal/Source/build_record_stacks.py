"""Actual ten releases in four leaning groups, sharing layout with web browsing."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector,Matrix
R=Path(__file__).resolve().parents[1];O=R/'Review';bpy.ops.wm.open_mainfile(filepath=str(O/'reference-computer.blend'));s=bpy.context.scene;s.frame_set(1)
data=json.loads((O/'record-preview-data.json').read_text());size=data['sleeveSize'];rows=[]
for i,entry in enumerate(data['shelf']):
    root=next(o for o in s.objects if o.get('record_id')==entry['id'] and o.get('editable_record'))
    root.animation_data_clear();row=i//5;column=i%5;group=0 if column<3 else 1;rank=column if column<3 else column-3
    yaw=75;angle=-8;r=math.radians(yaw);depth=.014*rank
    bottom=Vector((-3.09-math.sin(r)*depth, (3.27 if group==0 else 3.98)+math.cos(r)*depth+rank*.009,entry['boardHeight']+.001))
    rotation=Matrix.Rotation(r,4,'Z')@Matrix.Rotation(math.radians(angle),4,'X')
    root.rotation_mode='QUATERNION';root.rotation_quaternion=rotation.to_quaternion();root.location=bottom+rotation.to_3x3()@Vector((0,0,size/2));root.scale=(size,)*3
    root['stack_group']=row*2+group;root['stack_rank']=rank
    rows.append({'id':entry['id'],'title':root['record_title'],'node':root.name,'slot':i,'group':row*2+group,'rank':rank,'bottomBlender':list(bottom),'yaw':yaw,'angle':angle,'scale':size})
report={'records':rows,'ownerOrder':data['order'],'ownerOrderWritten':False,'groups':4,'scope':'Ten actual releases, four leaning stacks. No invented extra catalogue items.','sleeveThickness':data['sleeveDepth']}
(O/'record-stack-layout.json').write_text(json.dumps(report,indent=2)+'\n')
# Clear the obsolete single-record baked clip; the shared browser route drives the new positions.
for o in s.objects:
    if o.name.startswith('Playable vinyl /'):o.animation_data_clear();o.scale=(0,0,0)
s.camera=bpy.data.objects['Reference camera / fitted'];s['status']='Blender room work version with four LP groups and computer. Not Unreal or a final approved scene.'
bpy.ops.wm.save_as_mainfile(filepath=str(O/'reference-room-stacks.blend'))
s.render.resolution_percentage=100;s.cycles.samples=64;s.render.filepath=str(O/'reference-room-stacks.png');bpy.ops.render.render(write_still=True)
