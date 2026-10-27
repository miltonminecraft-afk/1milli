"""Render the saved junction candidate without modifying it."""
import bpy
from pathlib import Path
O=Path(__file__).resolve().parents[1]/'Review'
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-junction.blend'));s=bpy.context.scene;s.frame_set(1)
for filename,cam in [('reference-junction.png','Reference camera / fitted'),('junction-inspection.png','Rear junction inspection camera')]:
 s.camera=bpy.data.objects[cam]
 if cam=='Rear junction inspection camera':s.render.resolution_x=600;s.render.resolution_y=1100;s.render.resolution_percentage=100
 s.render.filepath=str(O/filename);bpy.ops.render.render(write_still=True);print('JUNCTION_RENDERED',filename,flush=True)
