"""Cover the complete open-eye contour, not only its rectangular centre.

Reuse the frozen, character-specific v8 hidden-eye plate locally. Preserve
original hair/skin outside each explicit eyelid mask. Native model is unchanged.
"""
import hashlib,json,os,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
from psd_tools import PSDImage
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art/source';OUT=ROOT/'public/assets/detail-v13';OUT.mkdir(exist_ok=True)
W,H=1536,1360
source_path=SRC/'composition-neutral-v11.png';neutral_before=hashlib.sha256(source_path.read_bytes()).hexdigest()
source=np.array(Image.open(source_path).convert('RGBA'))
plate=np.array(Image.open(SRC/'closed-lids-ai-v8.png').convert('RGBA').resize((630,320),Image.Resampling.LANCZOS))
hidden=source.copy();hidden[693:1013,450:1080]=plate
polygons={
 'left':[(423,725),(475,706),(505,690),(525,687),(550,695),(580,711),(611,726),(648,744),(681,770),(706,792),(703,826),(686,854),(665,878),(636,886),(590,880),(551,876),(516,868),(491,850),(477,827),(467,799),(461,761)],
 'right':[(800,806),(831,785),(871,776),(909,786),(943,794),(978,805),(1010,809),(1044,817),(1084,831),(1120,846),(1125,891),(1062,924),(1035,943),(1004,963),(964,960),(929,953),(893,942),(859,931),(839,909),(828,878),(823,847)],
}
boxes={'left':(420,680,718,912),'right':(798,770,1132,982)}
layout=json.loads((SRC/'layers-v11.json').read_text(encoding='utf-8'));meta={p['id']:p for p in layout['layers']}
config=json.loads((ROOT/'public/assets/detail-v12/patches.json').read_text(encoding='utf-8'))
for p in config['patches']:p['show']='always' if p['always'] else 'mouth'
report={};new_images={}
for side,polygon in polygons.items():
 im=Image.new('L',(W*4,H*4));ImageDraw.Draw(im).polygon([(x*4,y*4) for x,y in polygon],fill=255)
 mask=np.array(im.resize((W,H),Image.Resampling.LANCZOS))
 # Identify real foreground hair using BOTH the original and the registered
 # closed plate. A blue pixel in the original lash alone is not protected.
 rgb=source[:,:,:3].astype(int);donor=hidden[:,:,:3].astype(int)
 cold=lambda a:(a[:,:,2]>a[:,:,0]+12)&(a[:,:,2]>a[:,:,1]+12)
 mask=np.array(Image.fromarray(mask).filter(ImageFilter.GaussianBlur(.65)))
 # Only agreed foreground hair is protected: original blue-black lashes
 # alone must not be mistaken for bangs. Smooth the one-pixel transition.
 original_hair=cold(rgb)&cold(donor)
 hair_guard=np.array(Image.fromarray((original_hair*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.55)))/255
 mask=np.rint(mask*(1-hair_guard)).astype('uint8')
 # Only skin samples outside the eye are used for a small local colour match.
 x,y,x1,y1=boxes[side];s=rgb[y:y1,x:x1];h=hidden[y:y1,x:x1,:3].astype(int);m=mask[y:y1,x:x1]
 skin=lambda a:(a[:,:,0]>220)&(a[:,:,1]>185)&(a[:,:,2]>170)&(a[:,:,0]>=a[:,:,1])&(a[:,:,1]>=a[:,:,2]-3)
 known=skin(s)&skin(h)&(m==0)
 offset=np.median(s[known]-h[known],axis=0) if known.sum()>10 else np.zeros(3)
 offset=np.clip(offset,-12,12)
 # The old AI plate also kept isolated upper lash/brow fragments. Keep the
 # connected, intended closed lash and replace dark ink above it with a skin
 # plane fitted to surrounding skin, without changing the original blue hair.
 yy,xx=np.mgrid[y:y1,x:x1]
 ink=(h[:,:,0]>h[:,:,1]*1.15)&(h[:,:,0]>h[:,:,2]*.94)&(h[:,:,0]<200)&(h[:,:,1]<155)
 seed_box=(497,761,683,835) if side=='left' else (840,838,1040,926)
 ax,ay,bx,by=seed_box
 # Pick the largest warm-ink component intersecting the expected closed arc.
 from collections import deque
 seen=np.zeros(ink.shape,bool);best=np.zeros(ink.shape,bool);best_count=0
 for sy,sx in zip(*np.nonzero(ink)):
  if seen[sy,sx]:continue
  points=[];q=deque([(sy,sx)]);intersects=False
  while q:
   ry,rx=q.popleft()
   if not(0<=ry<ink.shape[0] and 0<=rx<ink.shape[1]) or seen[ry,rx] or not ink[ry,rx]:continue
   seen[ry,rx]=True;points.append((ry,rx));intersects|=ax<=rx+x<bx and ay<=ry+y<by
   q.extend([(ry-1,rx),(ry+1,rx),(ry,rx-1),(ry,rx+1)])
  if intersects and len(points)>best_count:
   best[:]=False
   for ry,rx in points:best[ry,rx]=True
   best_count=len(points)
 assert best_count>100,(side,'closed lash not found')
 columns=np.flatnonzero(best.any(axis=0));upper=np.array([np.flatnonzero(best[:,col])[0]+y for col in columns])
 contour=np.interp(np.arange(x,x1),columns+x,upper)
 bad=ink&(yy<contour[None,:]-12)&(m>0)
 clean=np.array(Image.fromarray((bad*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.6)))/255
 protected=np.array(Image.fromarray((cold(h)*255).astype('uint8')))>0
 clean[(m==0)|protected]=0
 if side=='right':
  border=np.interp(yy,[820,840,860,890,920],[1057,1060,1059,1052,1042])
  tip_face=(xx>1035)&(xx<border)&(yy>825)&(yy<905)&ink
  extra=np.array(Image.fromarray((tip_face*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.6)))/255
  clean=np.maximum(clean,extra)
 fit_skin=skin(h)&(h[:,:,1]>205)
 coords=np.stack([np.ones(xx.shape), (xx-x)/max(1,x1-x),(yy-y)/max(1,y1-y)],axis=2)
 coefficients=np.linalg.lstsq(coords[fit_skin],h[fit_skin],rcond=None)[0]
 fitted=np.einsum('ijk,kl->ijl',coords,coefficients).clip(0,255)
 cleaned=h*(1-clean[:,:,None])+fitted*clean[:,:,None]
 local_hidden=hidden.copy();local_hidden[y:y1,x:x1,:3]=np.rint(cleaned).astype('uint8')
 fill=(local_hidden[:,:,:3].astype(float)+offset).clip(0,255)
 a=mask[:,:,None]/255
 result=source.copy();result[:,:,:3]=np.rint(source[:,:,:3]*(1-a)+fill*a).astype('uint8')
 outside_changed=int(np.any(result[:,:,:3]!=source[:,:,:3],axis=2)[mask==0].sum())
 assert outside_changed==0,(side,'changed pixels outside authorized eye mask')
 assert np.array_equal(result[:,:,3],source[:,:,3]),'source alpha changed'
 # Small isolated outer lash wings lie over hair, beyond the cheek.
 # Replace only their dark ink, using a fitted ORIGINAL neighbouring hair
 # colour plane. Do not paint the surrounding hair rectangle or touch skin.
 tip=Image.new('L',(W,H));tip_points=([(452,731),(479,740),(489,728),(488,770),(470,757)] if side=='left' else [(1060,855),(1083,877),(1103,890),(1084,901),(1059,922)])
 ImageDraw.Draw(tip).polygon(tip_points,fill=255)
 tip=np.array(tip)>0
 dark=(rgb.max(axis=2)<175)&(rgb[:,:,2]>rgb[:,:,1])
 target=tip&dark
 edit=np.array(Image.fromarray((target*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.7)))/255
 gy,gx=np.mgrid[:H,:W]
 local=(gx>x-20)&(gx<x1+20)&(gy>y)&(gy<y1)
 near=Image.fromarray((tip*255).astype('uint8')).filter(ImageFilter.MaxFilter(51))
 samples=(np.array(near)>0)&~tip&cold(rgb)&(rgb[:,:,2]>140)&(rgb[:,:,0]>45)
 coordinates=np.stack([np.ones((H,W)),(gx-x)/(x1-x),(gy-y)/(y1-y)],axis=2)
 coeff=np.linalg.lstsq(coordinates[samples],rgb[samples],rcond=None)[0]
 hair_fill=np.einsum('ijk,kl->ijl',coordinates,coeff).clip(0,255)
 result[:,:,:3]=np.rint(result[:,:,:3]*(1-edit[:,:,None])+hair_fill*edit[:,:,None]).astype('uint8')
 mask=np.maximum(mask,np.ceil(edit*255).astype('uint8'))
 outside_changed=int(np.any(result[:,:,:3]!=source[:,:,:3],axis=2)[mask==0].sum())
 assert outside_changed==0
 tile=Image.fromarray(result[y:y1,x:x1]);tile.save(OUT/f'closed-{side}.png');new_images[side]=tile
 Image.fromarray(mask[y:y1,x:x1]).save(OUT/f'closed-{side}-mask.png')
 config['patches'].append({'id':'closed-'+side,'file':f'/assets/detail-v13/closed-{side}.png','box':[x,y,x1,y1],'always':False,'show':side+'Closed'})
 old=meta['lid-'+side];assert x<=old['x'] and y<=old['y'] and x1>=old['x']+old['width'] and y1>=old['y']+old['height']
 assert result[old['y']:old['y']+old['height'],old['x']:old['x']+old['width'],3].min()==255
 report[side]={'box':[x,y,x1,y1],'maskedPixels':int((mask>0).sum()),'localColourOffset':offset.tolist(),'nativeOldLidRectFullyCovered':True,'outsideMaskChangedPixels':outside_changed,'outsideMaskSourceRgbUnchanged':outside_changed==0,'upperResidualInkCleanedPixels':int((clean>0).sum())}
config.update(schema=2,closedEyes='complete eyelid boundary including outer corner; original hair protected',nativeExportModified=False)
(OUT/'patches.json').write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
psd=PSDImage.new(mode='RGB',size=(1584,H),depth=8)
for p in layout['layers']:
 layer=psd.create_pixel_layer(Image.open(ROOT/('public'+p['file'])),name=p['id'],left=p['x']+24,top=p['y']);layer.opacity=round(255*p['opacity'])
for p in config['patches']:
 layer=psd.create_pixel_layer(Image.open(ROOT/('public'+p['file'])),name='runtime-'+p['id'],left=p['box'][0]+24,top=p['box'][1]);layer.opacity=255 if p['show']=='always' else 0
psd.save(SRC/'YangyangXuanling-Details-v13.psd')
assert hashlib.sha256(source_path.read_bytes()).hexdigest()==neutral_before
(ROOT/'docs/closed-eyes-v13.json').write_text(json.dumps({'nativeBase':'v11','runtimeRepair':True,'sourcePlate':'closed-lids-ai-v8.png; crop x450 y693 width630 height320','sides':report,'neutralSourceChangedPixels':0,'neutralSourceSha256':neutral_before},indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
