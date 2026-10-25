"""Technical extraction of complete disconnected poses, never articulated body parts."""
import numpy as np

def components(mask):
 h,w=mask.shape;parents=[0];runs=[];previous=[]
 def root(n):
  while parents[n]!=n:parents[n]=parents[parents[n]];n=parents[n]
  return n
 for y in range(h):
  edges=np.diff(np.concatenate(([False],mask[y],[False])).astype(np.int8));starts=np.flatnonzero(edges==1);ends=np.flatnonzero(edges==-1);current=[];left=0
  for a,b in zip(starts.tolist(),ends.tolist()):
   n=len(parents);parents.append(n)
   while left<len(previous)and previous[left][1]<a:left+=1
   j=left
   while j<len(previous)and previous[j][0]<=b:
    p=previous[j][2];rn,rp=root(n),root(p)
    if rn!=rp:parents[rn]=rp
    j+=1
   current.append((a,b,n));runs.append((y,a,b,n))
  previous=current
 labels=np.zeros((h,w),np.int32);stats={}
 for y,a,b,n in runs:
  k=root(n);labels[y,a:b]=k;area=b-a
  if k not in stats:stats[k]={'label':k,'area':0,'bounds':[a,y,b,y+1],'sumX':0.,'sumY':0.}
  s=stats[k];s['area']+=area;s['sumX']+=(a+b-1)*area/2;s['sumY']+=y*area;s['bounds']=[min(s['bounds'][0],a),min(s['bounds'][1],y),max(s['bounds'][2],b),max(s['bounds'][3],y+1)]
 for s in stats.values():s['centroid']=[s.pop('sumX')/s['area'],s.pop('sumY')/s['area']]
 return labels,sorted(stats.values(),key=lambda s:s['area'],reverse=True)

def extract(native,columns,rows):
 rgba=np.array(native);labels,stats=components(rgba[:,:,3]>0);count=columns*rows
 assert len(stats)>=count,'Connected figures cannot be split into independent poses'
 major=stats[:count];assert major[-1]['area']>=major[0]['area']*.2,'A complete body is missing or joined to its neighbor'
 assert sum(s['area']for s in major)>=sum(s['area']for s in stats)*.9,'Large disconnected props require explicit review'
 # Sort the complete figures by row, then column; no limb translation or pose changes.
 major.sort(key=lambda s:s['centroid'][1]);ordered=[]
 for row in range(rows):ordered.extend(sorted(major[row*columns:(row+1)*columns],key=lambda s:s['centroid'][0]))
 owner=np.zeros(labels.shape,np.uint8);bylabel={s['label']:i+1 for i,s in enumerate(ordered)}
 points={s['label']:np.where(labels==s['label'])for s in ordered}
 for s in stats:
  k=s['label']
  if k not in bylabel:
   x,y=s['centroid']
   nearest=min(ordered,key=lambda m:float(np.min((points[m['label']][1]-x)**2+(points[m['label']][0]-y)**2)))
   bylabel[k]=bylabel[nearest['label']]
  owner[labels==k]=bylabel[k]
 frames=[];rects=[]
 for n in range(1,count+1):
  ys,xs=np.where(owner==n);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
  a,b,c,d=box;piece=rgba[b:d,a:c].copy();piece[owner[b:d,a:c]!=n]=0
  from PIL import Image
  frames.append(Image.fromarray(piece));rects.append(box)
 assert np.all((owner>0)==(rgba[:,:,3]>0))
 return owner,frames,rects,ordered
