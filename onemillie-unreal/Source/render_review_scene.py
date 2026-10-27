"""Render two existing review cameras without rebuilding or modifying the saved scene."""
import bpy,sys,re
from pathlib import Path
O=Path(__file__).resolve().parents[1]/'Review'
args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2 or not re.fullmatch(r'reference-[a-z-]+\.blend',args[0]) or not re.fullmatch(r'[a-z-]+',args[1]):raise ValueError('Expected reference-name.blend and image suffix')
bpy.ops.wm.open_mainfile(filepath=str(O/args[0]));scene=bpy.context.scene;scene.frame_set(1)
for name,cam in [(f'reference-{args[1]}.png','Reference camera / fitted'),(f'{args[1]}-workbench.png','Workbench camera / same room')]:
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(O/name);bpy.ops.render.render(write_still=True);print('REVIEW_RENDERED',name,flush=True)
