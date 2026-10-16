"""Separate stationary sclera apertures from complete, original-pixel irises.

All v10 non-eye visible pixels and alpha are retained. Only the occluded iris
perimeter and contaminated cutout border are repaired; no global repaint/grade.
The two eye-* layers become genuine Cubism clipping masks for the irises.
"""
import json, os, sys
from pathlib import Path
if os.environ.get('PET_PSD_TOOLS'): sys.path.insert(0, os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'art/source'
OUT=ROOT/'public/assets/v11'; OUT.mkdir(exist_ok=True)
W,H=1536,1360
layout=json.loads((SRC/'layers-v10.json').read_text())
meta={p['id']:p.copy() for p in layout['layers']}
objects={}
for p in layout['layers']:
 im=Image.new('RGBA',(W,H)); im.alpha_composite(Image.open(ROOT/('public'+p['file'])),(p['x'],p['y']))
 objects[p['id']]=np.array(im)
original=np.array(Image.open(SRC/'composition-neutral-v6.png').convert('RGBA'))
under=np.array(Image.open(SRC/'occlusion-underpaint-ai-v7.png').convert('RGBA').resize((W,H),Image.Resampling.LANCZOS))

def curve(start, segments):
 points=[start]; p=np.array(start,float)
 for a,b,c in segments:
  a,b,c=map(lambda q:np.array(q,float),(a,b,c))
  for t in np.linspace(0,1,33)[1:]:
   q=(1-t)**3*p+3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3*c
   points.append(tuple(q))
  p=c
 return points

def polygon(points):
 im=Image.new('L',(W*4,H*4)); ImageDraw.Draw(im).polygon([(round(x*4),round(y*4)) for x,y in points],fill=255)
 return np.array(im.resize((W,H),Image.Resampling.LANCZOS))

apertures={
 'left':curve((506,767),[
  ((535,749),(572,743),(600,749)),((637,751),(667,771),(680,794)),
  ((689,816),(676,851),(650,869)),((620,862),(591,857),(563,857)),
  ((538,858),(519,846),(508,825)),((502,808),(502,782),(506,767))]),
 'right':curve((851,855),[
  ((867,831),(888,822),(913,826)),((956,830),(988,850),(1004,877)),
  ((1014,900),(996,932),(977,947)),((963,954),(945,947),(927,940)),
  ((900,930),(873,924),(855,919)),((846,905),(846,877),(851,855))])
}
# These traces follow the dark outer iris contour, including its white glints.
# The red lower eyelid and the white sclera are deliberately outside the trace.
visible={
 'left':curve((573,750),[
  ((548,762),(535,806),(546,835)),((548,845),(556,854),(568,858)),
  ((598,859),(624,864),(649,869)),((668,856),(682,827),(675,800)),
  ((667,773),(634,751),(601,749)),((591,748),(580,748),(573,750))]),
 'right':curve((890,826),[
  ((868,833),(852,856),(851,885)),((850,901),(852,914),(858,920)),
  ((883,925),(918,937),(940,947)),((966,940),(990,904),(987,874)),
  ((986,846),(953,828),(921,825)),((908,823),(899,823),(890,826))])
}
ellipses={'left':(540,731,680,891),'right':(848,801,991,964)}
report={}; masks={}
for side in ['left','right']:
 aperture=polygon(apertures[side]); seed_alpha=polygon(visible[side]); masks[side]=aperture
 # Restore the fixed lash/skin/hair to the head texture; hidden sclera is the
 # already approved underpaint, constrained to the actual eyelid aperture.
 ep=meta['eye-'+side]; x,y,ww,hh=ep['x'],ep['y'],ep['width'],ep['height']
 objects['head-body'][y:y+hh,x:x+ww]=original[y:y+hh,x:x+ww]
 region=aperture>0
 a=aperture[region,None]/255
 objects['head-body'][region,:3]=np.rint(original[region,:3]*(1-a)+under[region,:3]*a).astype('uint8')
 sclera=under.copy(); sclera[:,:,3]=aperture; objects['eye-'+side]=sclera
 # Complete only the iris area previously hidden by the eyelids. The visible
 # source pixels stay exact; growth is not allowed to seed from white/skin.
 box=ellipses[side]; ix,iy,ix1,iy1=box; iw,ih=ix1-ix,iy1-iy
 tile=original[iy:iy1,ix:ix1,:3].astype(float)
 # Preserve the dark source contour, but reject sclera/lid contamination at
 # its outer antialias band. Bright glints are restored exactly afterwards;
 # they must not grow into vertical streaks in the hidden perimeter.
 visible_known=seed_alpha[iy:iy1,ix:ix1]>250
 # The dark blue contour bounds each row. This trims the exterior white
 # fringe, while preserving all white/peach highlights enclosed by the iris.
 cold=(tile[:,:,2]>=tile[:,:,0]-5)&(tile[:,:,2]>=tile[:,:,1]-10)&(tile.max(axis=2)<220)
 for row in range(ih):
  xs=np.flatnonzero(visible_known[row]&cold[row])
  if len(xs):visible_known[row,:xs[0]]=False;visible_known[row,xs[-1]+1:]=False
  else:visible_known[row]=False
 source_tile=tile.copy()
 known=visible_known.copy()
 original_known=visible_known.copy()
 for _ in range(90):
  sums=np.zeros_like(tile); count=np.zeros((ih,iw),float)
  for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:
   kk=np.roll(known,(dy,dx),(0,1)); vv=np.roll(tile,(dy,dx),(0,1))
   if dy<0:kk[-1,:]=False
   if dy>0:kk[0,:]=False
   if dx<0:kk[:,-1]=False
   if dx>0:kk[:,0]=False
   sums+=vv*kk[:,:,None]; count+=kk
  grow=~known&(count>0); tile[grow]=sums[grow]/count[grow,None]; known|=grow
  if known.all():break
 smooth=np.array(Image.fromarray(np.rint(tile).clip(0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.8)))
 tile[~original_known]=smooth[~original_known]
 tile[original_known]=source_tile[original_known]
 # Complete elliptic support extends behind both eyelids. The source colour
 # trace is retained inside it; final visibility comes from the native mask.
 e=Image.new('L',(iw*4,ih*4));ImageDraw.Draw(e).ellipse((0,0,iw*4-1,ih*4-1),fill=255)
 alpha=np.array(e.resize((iw,ih),Image.Resampling.LANCZOS))
 seed=seed_alpha[iy:iy1,ix:ix1]
 # Include any source contour that reaches beyond the fitted ellipse.
 alpha=np.maximum(alpha,seed)
 iris=np.zeros((H,W,4),np.uint8);iris[iy:iy1,ix:ix1,:3]=np.rint(tile).clip(0,255).astype('uint8');iris[iy:iy1,ix:ix1,3]=alpha
 objects['iris-'+side]=iris;meta['iris-'+side].update(x=ix,y=iy,width=iw,height=ih)
 report[side]={'clippingMask':'eye-'+side,'sourceSeedPixels':int(original_known.sum()),'completedHiddenPixels':int(((alpha>0)&~original_known).sum()),'stationaryLashes':True}

order=['head-body','eye-left','eye-right','iris-left','iris-right','lid-left','lid-right','keyboard','mouse','sleeve-roots','mouse-hand','keyboard-hand','bird']
psd=PSDImage.new(mode='RGB',size=(W,H),depth=8); composite=Image.new('RGBA',(W,H)); new=[]
for name in order:
 p=meta[name]; im=Image.fromarray(objects[name]); box=(p['x'],p['y'],p['x']+p['width'],p['y']+p['height'])
 tile=im.crop(box);tile.save(OUT/f'{name}.png');p['file']=f'/assets/v11/{name}.png'
 lay=psd.create_pixel_layer(tile,name=name,left=p['x'],top=p['y']);lay.opacity=round(p['opacity']*255)
 if p['opacity']:
  if name.startswith('iris-'):
   clipped=objects[name].copy();clipped[:,:,3]=(clipped[:,:,3].astype(float)*masks[name[5:]]/255).round().astype('uint8');composite.alpha_composite(Image.fromarray(clipped))
  else:composite.alpha_composite(tile,(p['x'],p['y']))
 new.append(p)
psd.save(SRC/'YangyangXuanling-Separated-v11.psd');composite.save(SRC/'composition-neutral-v11.png')
(SRC/'layers-v11.json').write_text(json.dumps({'schema':5,'canvas':{'width':W,'height':H},'layers':new,'clipping':{'iris-left':'eye-left','iris-right':'eye-right'}},indent=2)+'\n')
before=np.array(Image.open(SRC/'composition-neutral-v10.png'));diff=np.any(np.array(composite)!=before,axis=2)
allowed=np.zeros((H,W),bool)
for side in ['left','right']:
 p=meta['eye-'+side];allowed[p['y']:p['y']+p['height'],p['x']:p['x']+p['width']]=True
assert not (diff&~allowed).any()
report.update(neutralChangedPixels=int(diff.sum()),outsideEyeRectsChangedPixels=int((diff&~allowed).sum()),nativeImport='pending')
(ROOT/'docs/eye-masks-v11.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
