import bpy,json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'Review';bpy.ops.wm.open_mainfile(filepath=str(O/'reference-room-stacks.blend'));s=bpy.context.scene;s.frame_set(1)
# Avoid a singular static ancestor while exporting the vinyl hierarchy. The web
# player hides the vinyl entity until the extraction phase.
for o in s.objects:
    if o.name.startswith('Playable vinyl /'):o.scale=(1,1,1)
bpy.context.view_layer.update()
# Export the same current geometry. Browser lighting remains separate from Cycles.
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
    if not o.hide_render and not o.hide_get():o.select_set(True)
kwargs=dict(filepath=str(O/'room-stacks.glb'),export_format='GLB',use_selection=True,export_cameras=True,export_extras=True,export_animations=True,export_lights=False,export_apply=True)
props=bpy.ops.export_scene.gltf.get_rna_type().properties
if 'export_animation_mode' in props:kwargs.update(export_animation_mode='SCENE',export_anim_scene_split_object=False)
bpy.ops.export_scene.gltf(**kwargs)
if '--export-only' in sys.argv:raise SystemExit(0)
for camera,file in [('Workbench camera / same room','room-stacks-workbench.png'),('Record interaction camera','room-stacks-storage.png')]:
    if camera=='Record interaction camera':s.frame_set(37)
    s.camera=bpy.data.objects[camera];s.render.resolution_percentage=80;s.cycles.samples=48;s.render.filepath=str(O/file);bpy.ops.render.render(write_still=True)
