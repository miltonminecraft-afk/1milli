import json,math,datetime
from pathlib import Path
from mathutils import Vector,Matrix
O=Path(__file__).resolve().parents[1]/'Review';data=json.loads((O/'stack-browse-samples.json').read_text());layout=json.loads((O/'record-stack-layout.json').read_text());issues=[];count=0;min_gap=10
def box(p):
 r=Matrix.Rotation(math.radians(p['ry']),3,'Z')@Matrix.Rotation(math.radians(p['rx']),3,'X')
 return Vector((p['x'],-p['z'],p['y'])),[r.col[i] for i in range(3)],Vector((.5,.012,.5))*p['scale']
def intersect(a,b):
 ca,aa,ha=a;cb,ab,hb=b;delta=cb-ca
 for axis in aa+ab+[u.cross(v) for u in aa for v in ab]:
  if axis.length_squared<1e-12:continue
  axis=axis.normalized();ra=sum(ha[i]*abs(axis.dot(aa[i])) for i in range(3));rb=sum(hb[i]*abs(axis.dot(ab[i])) for i in range(3))
  if abs(axis.dot(delta))>=ra+rb-1e-6:return False
 return True
for transition in data:
 for n,sample in enumerate(transition['samples']):
  boxes=[box(p) for p in sample]
  for i,a in enumerate(boxes):
   c,axes,half=a;lowest=c.z-sum(abs(axes[k].z)*half[k] for k in range(3));gap=lowest-(layout['records'][i]['bottomBlender'][2]-.001);min_gap=min(min_gap,gap)
   if gap < -1e-5:issues.append({'kind':'shelf penetration','slot':i,'gap':gap})
   for j,b in enumerate(boxes[i+1:],i+1):
    count+=1
    if intersect(a,b):issues.append({'kind':'sleeve overlap','from':transition['from'],'to':transition['to'],'sample':n,'slots':[i,j]})
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':not issues,'transitions':len(data),'samplesPerTransition':21,'sleevePairChecks':count,'minimumShelfGap':min_gap,'issues':issues[:30],'issueCount':len(issues),'ownerOrderWritten':False,'method':'World oriented boxes, full separating-axis test and bottom support clearance; all direct/reverse/reset selections.'}
(O/'stack-browse-verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));assert not issues
