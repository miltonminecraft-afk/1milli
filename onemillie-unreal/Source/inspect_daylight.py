"""Inspect light setup and actual camera rays through the garage openings."""
import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=Path(__file__).resolve().parents[1];O=R/'Review';bpy.ops.wm.open_mainfile(filepath=str(O/'reference-junction.blend'));s=bpy.context.scene;s.frame_set(1)
lights=[{'name':o.name,'type':o.data.type,'hidden':o.hide_render,'energy':o.data.energy,'color':list(o.data.color),'position':list(o.location),'direction':list(o.rotation_euler.to_matrix()@Vector((0,0,-1))),'size':o.data.size if o.data.type=='AREA' else None,'sizeY':o.data.size_y if o.data.type=='AREA' else None} for o in s.objects if o.type=='LIGHT']
nodes=[{'name':n.name,'type':n.type,'inputs':{p.name:list(p.default_value) if hasattr(p.default_value,'__len__') else p.default_value for p in n.inputs if hasattr(p,'default_value')}} for n in s.world.node_tree.nodes]
obs=[o for o in s.objects if o.type=='MESH' and not o.hide_render and (o.name.startswith('Architecture / ') or o.name.startswith(('Detail / doorway','Detail / shutter')))]
vertices=[];polys=[];owners=[]
for o in obs:
 o.data.calc_loop_triangles();base=len(vertices);vertices.extend(o.matrix_world@v.co for v in o.data.vertices)
 for tri in o.data.loop_triangles:polys.append(tuple(base+i for i in tri.vertices));owners.append(o.name)
tree=BVHTree.FromPolygons(vertices,polys,all_triangles=True);cam=bpy.data.objects['Reference camera / fitted'].matrix_world.translation;back=json.loads((R/'Reference/camera-calibration.json').read_text())['room']['backY'];rays=[]
for z in [3.30,3.33,3.36,.032]:
 for x in [-2.5,-1.5,-.5,0]:
  target=Vector((x,back+.1,z));hit=tree.ray_cast(cam,(target-cam).normalized(),20)
  rays.append({'target':list(target),'firstHit':owners[hit[2]] if hit[0] is not None else None,'hitPosition':list(hit[0]) if hit[0] is not None else None})
out={'lights':lights,'world':nodes,'cameraGapRays':rays,'cycles':{'samples':s.cycles.samples,'maxBounces':s.cycles.max_bounces},'view':{'transform':s.view_settings.view_transform,'look':s.view_settings.look,'exposure':s.view_settings.exposure}}
(O/'daylight-inspection.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out),flush=True)
