import bpy,json,datetime,sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
R=Path(__file__).resolve().parents[1];O=R/'Review'
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
scene_name=args[0] if args else 'reference-atmosphere.blend'
report_name=args[1] if len(args)>1 else 'atmosphere-verification.json'
frames=(1,109,289,577)
bpy.ops.wm.open_mainfile(filepath=str(O/'reference-records.blend'))
before={};names=[o.name for o in bpy.context.scene.objects if o.type!='LIGHT' and o.name!='Calibration / music table lower shelf']
for frame in frames:
 bpy.context.scene.frame_set(frame);before[frame]={n:bpy.data.objects[n].matrix_world.copy() for n in names}
bpy.ops.wm.open_mainfile(filepath=str(O/scene_name))
scene=bpy.context.scene;maximum=0;differences=[]
hidden_original=[n for n in names if bpy.data.objects[n].hide_viewport]
# Disabled objects are not evaluated on loading; enable them in memory for the
# pose comparison. This checker never saves the file or changes render flags.
for name in hidden_original:bpy.data.objects[name].hide_viewport=False
bpy.context.view_layer.update()
for frame in frames:
 scene.frame_set(frame)
 for name in names:
  assert name in bpy.data.objects,name
  matrix=bpy.data.objects[name].matrix_world
  delta=max(abs(matrix[i][j]-before[frame][name][i][j]) for i in range(4) for j in range(4));maximum=max(maximum,delta)
  if delta>1e-6:differences.append({'frame':frame,'name':name,'delta':delta})
print('DIFFERENCES',json.dumps(sorted(differences,key=lambda x:-x['delta'])[:15]),flush=True)
assert maximum<1e-6,maximum
scene.frame_set(1);bpy.context.view_layer.update()
def bounds(meshes):
 points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
 return [[fn(p[i] for p in points) for i in range(3)] for fn in (min,max)]
music=[o for o in scene.objects if o.name.startswith('Detail / music table') and o.type=='MESH']
floorplant=[o for o in scene.objects if o.name.startswith('Detail / floor plant') and o.type=='MESH']
cal=json.loads((R/'Reference/camera-calibration.json').read_text())
musicbounds=bounds(music);plantbounds=bounds(floorplant)
assert abs(musicbounds[0][2])<1e-6
assert abs(musicbounds[1][2]-(cal['tableEnvelope']['height']+.035))<1e-6
assert abs(plantbounds[0][2])<1e-6
assert plantbounds[1][1]<cal['room']['backY']-.02
plant_support=[]
for role,index in [('foreground pothos',0),('shelf pothos',1)]:
 pots=[o for o in scene.objects if o.name.startswith('Detail / '+role+' / ') and 'POT_WOOD' in o.name]
 lo,hi=bounds(pots);s=cal['shelfEnvelope']
 assert lo[0]>=s['frontX']-s['depth']-.002 and hi[0]<=s['frontX']+.002,(role,lo,hi)
 assert lo[1]>=s['nearY']-.002 and hi[1]<=s['farY']+.002,(role,lo,hi)
 gap=lo[2]-(s['levels'][index]+.0175);assert abs(gap)<.001,(role,gap)
 plant_support.append({'plant':role,'potBounds':[lo,hi],'supportGap':gap})
images=[im for im in bpy.data.images if im.source=='FILE' and im.size[0]>0]
assert all(im.packed_file for im in images),'Unpacked image'
detail_check=None
if (O/'foliage-record-clearance.json').exists():
 c=json.loads((O/'foliage-record-clearance.json').read_text())
 if c['scene']==scene_name and c['passed']:detail_check='foliage-record-clearance.json'
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':True,'unrealSceneBuilt':False,'scene':scene_name,
 'comparedObjectCount':len(names),'sampledFrames':frames,'maximumUnchangedObjectMatrixError':maximum,'temporarilyEnabledForPoseEvaluation':hidden_original,
 'musicTableBounds':musicbounds,'musicTableTopMatchesExistingTurntableSupport':True,
 'floorPlantBounds':plantbounds,'floorPlantOnFloorAndInFrontOfBackWall':True,'shelfPlantSupports':plant_support,
 'packedImages':len(images),'visualApproval':False,
 'detailRouteClearanceReport':detail_check,
 'limits':['Verification proves retained poses and support, not an identical appearance.',
 'New detail mesh routes passed a separate sampled triangle check.' if detail_check else 'New leaf silhouette intersections are not yet part of the full ten-record collision audit.',
 'Unreal engine lighting still requires validation.']}
(O/report_name).write_text(json.dumps(report,indent=2)+'\n')
print('ATMOSPHERE_VERIFIED',json.dumps(report))
