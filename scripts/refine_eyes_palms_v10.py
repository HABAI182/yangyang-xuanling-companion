"""Original-pixel palm mattes and fixed eye rims above moving irises.

No whole-image generation. Hidden white/skin reuses the existing frozen
underpaint. Existing mesh IDs, gaze and hand bindings can be retained.
"""
import json,os,sys
from pathlib import Path
from collections import deque
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
from psd_tools import PSDImage
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art/source';OUT=ROOT/'public/assets/v10';OUT.mkdir(exist_ok=True)
w,h=1536,1360;layout=json.loads((SRC/'layers-v9.json').read_text());meta={p['id']:p.copy() for p in layout['layers']}
objects={}
for p in layout['layers']:
 im=Image.new('RGBA',(w,h));im.alpha_composite(Image.open(ROOT/('public'+p['file'])),(p['x'],p['y']));objects[p['id']]=np.array(im)
original=np.array(Image.open(SRC/'composition-neutral-v6.png').convert('RGBA'))
ai=np.array(Image.open(SRC/'occlusion-underpaint-ai-v7.png').convert('RGBA').resize((w,h),Image.Resampling.LANCZOS))
closed_skin=objects['head-body'].copy()
def largest(mask):
 seen=np.zeros(mask.shape,bool);best=[]
 for y,x in zip(*np.nonzero(mask)):
  if seen[y,x]:continue
  component=[];q=deque([(y,x)]);seen[y,x]=True
  while q:
   yy,xx=q.popleft();component.append((yy,xx))
   for a,b in ((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)):
    if 0<=a<mask.shape[0] and 0<=b<mask.shape[1] and mask[a,b] and not seen[a,b]:seen[a,b]=True;q.append((a,b))
  if len(component)>len(best):best=component
 result=np.zeros(mask.shape,bool)
 for y,x in best:result[y,x]=True
 return result
def fill_holes(mask):
 outside=np.zeros(mask.shape,bool);q=deque()
 for y,x in [(0,x) for x in range(mask.shape[1])]+[(mask.shape[0]-1,x) for x in range(mask.shape[1])]+[(y,0) for y in range(mask.shape[0])]+[(y,mask.shape[1]-1) for y in range(mask.shape[0])]:
  if not mask[y,x] and not outside[y,x]:outside[y,x]=True;q.append((y,x))
 while q:
  y,x=q.popleft()
  for a,b in [(y-1,x),(y+1,x),(y,x-1),(y,x+1)]:
   if 0<=a<mask.shape[0] and 0<=b<mask.shape[1] and not mask[a,b] and not outside[a,b]:outside[a,b]=True;q.append((a,b))
 return ~outside
hand_reports={}
for name in ['mouse-hand','keyboard-hand']:
 p=meta[name];x,y,ww,hh=p['x'],p['y'],p['width'],p['height'];tile=original[y:y+hh,x:x+ww].astype(np.int32)
 coarse=Image.fromarray(objects[name][y:y+hh,x:x+ww,3]).filter(ImageFilter.MaxFilter(7))
 skin=(tile[:,:,0]>190)&(tile[:,:,1]>150)&(tile[:,:,2]>130)&(tile[:,:,0]>=tile[:,:,1]-2)&(tile[:,:,0]>tile[:,:,2]+2)&(tile[:,:,0]<tile[:,:,1]+75)&(np.array(coarse)>0)&(tile[:,:,3]>0)
 skin=fill_holes(largest(skin))
 core=Image.fromarray((skin*255).astype('uint8')).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
 mask=fill_holes(largest(np.array(core.filter(ImageFilter.MaxFilter(3)))>0))
 old_tile=objects[name][y:y+hh,x:x+ww,3]>0
 mask[:int(hh*.6)]&=old_tile[:int(hh*.6)]
 if name=='mouse-hand':
  # The cuff has a pink reflection immediately above the palm. A conservative
  # traced upper contour separates that reflection from the moving skin.
  points=[(239,1062),(239,1054),(248,1038),(263,1023),(280,1010),(303,1002),(328,997),(352,997),(375,1002),(394,1014),(408,1032),(417,1048),(420,1062),(415,1078),(406,1088),(392,1097),(377,1099),(362,1094),(350,1085),(339,1089),(327,1087),(313,1080),(302,1087),(288,1085),(273,1075),(264,1081),(253,1079),(243,1072)]
  trace=Image.new('L',(ww,hh));ImageDraw.Draw(trace).polygon([(xx-x,yy-y) for xx,yy in points],fill=255);cut=int(hh*.62);mask[:cut]&=np.array(trace)[:cut]>0
 mask=Image.fromarray((mask*255).astype('uint8')).filter(ImageFilter.GaussianBlur(.3))
 a=np.zeros((h,w),np.uint8);a[y:y+hh,x:x+ww]=np.array(mask)
 a=np.minimum(a,original[:,:,3]);old=objects[name][:,:,3]>0;new=a>0
 returned=old&~new
 objects['head-body'][returned,:3]=ai[returned,:3];objects['head-body'][returned,3]=original[returned,3]
 objects['head-body'][new,:3]=ai[new,:3];objects['head-body'][new,3]=original[new,3]
 # Return discarded cuff pixels to their own sleeve layer, never the palm.
 cold=(original[:,:,2]>=original[:,:,0])|(original[:,:,0]<140)
 objects['sleeve-roots'][returned,3]=0;objects['sleeve-roots'][returned&cold]=original[returned&cold];objects['sleeve-roots'][new,3]=0
 d=original.copy();d[:,:,3]=a;objects[name]=d
 hand_reports[name]={'skinPixels':int(skin.sum()),'discardedCoarseMaskPixels':int(returned.sum()),'sourceBoundsRetained':True}

# Trace only the paper-filled gaps identified by the user's red circles.
# The white feather ornament, pale hair ends and blue ribbon remain untouched.
gap_polygons=[
 [(202,583),(224,557),(247,540),(269,528),(263,540),(244,550),(221,568)],
 [(231,562),(253,542),(277,530),(270,542),(249,552)],
 [(190,620),(214,614),(249,602),(236,631),(224,658),(213,681),(190,700),(167,720),(162,706),(163,682),(172,652)],
 [(129,769),(158,753),(183,745),(202,738),(188,761),(172,787),(151,806),(131,805),(119,800),(121,783)],
 [(1206,420),(1220,439),(1240,467),(1256,496),(1271,531),(1280,549),(1263,530),(1243,511),(1229,488),(1219,462)],
 [(1251,547),(1264,562),(1278,575),(1290,586),(1291,607),(1286,631),(1276,617),(1266,597),(1259,575)],
]
gap_seeds=[(218,566),(251,546),(202,654),(153,777),(1241,480),(1274,591)]
gaps=np.zeros((h,w),bool);rgb=original[:,:,:3].astype(np.int32)
paper=(rgb.min(axis=2)>200)&((rgb.max(axis=2)-rgb.min(axis=2))<24)
for gap_index,(poly,(sx,sy)) in enumerate(zip(gap_polygons,gap_seeds)):
 roi=Image.new('L',(w,h));ImageDraw.Draw(roi).polygon(poly,fill=255)
 candidate=(np.array(roi.filter(ImageFilter.MaxFilter(19)))>0)&paper
 if not candidate[sy,sx]:
  yy,xx=np.nonzero(candidate);distance=(xx-sx)**2+(yy-sy)**2;near=distance.argmin()
  assert distance[near]<18**2,(sx,sy)
  sx,sy=int(xx[near]),int(yy[near])
 seen=np.zeros((h,w),bool);q=deque([(sy,sx)])
 while q:
  yy,xx=q.popleft()
  if not(0<=xx<w and 0<=yy<h) or seen[yy,xx] or not candidate[yy,xx]:continue
  seen[yy,xx]=True
  q.extend([(yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)])
 assert seen.any(),(sx,sy)
 if gap_index>=3:seen|=candidate
 if gap_index==3:
  yy,xx=np.indices((h,w));seen&=(xx>125)&(yy<806)
 gaps|=seen
# Remove the light contaminated pixel next to the traced paper component too.
gap_alpha=np.array(Image.fromarray((gaps*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.25)))
# A few grey antialias islands inside the lower transparent gap are not paper
# white enough for the colour flood. This box is wholly inside that empty gap.
gap_alpha[748:756,177:188]=255
for d in objects.values():d[:,:,3]=np.minimum(d[:,:,3],255-gap_alpha)

# The moving keyboard cuff must stop at the actual sleeve seam. The blue/white
# hair strip and small face fragment are restored to the fixed head layer.
cuff_im=Image.new('L',(w,h));ImageDraw.Draw(cuff_im).polygon([
 (918,1017),(940,1010),(968,1006),(992,1009),(1020,1015),(1060,1028),(1100,1045),
 (1138,1070),(1172,1104),(1140,1131),(1090,1120),(1046,1120),
 (1000,1118),(985,1070)
],fill=255)
cuff_keep=np.array(cuff_im.filter(ImageFilter.GaussianBlur(.35)))
right_region=np.indices((h,w))[1]>750
root_before=objects['sleeve-roots'][:,:,3].copy()
root_removed=right_region&(root_before>0)&(cuff_keep<255)
# Do not restore discarded warm palm outlines into the fixed head texture.
# Genuine face pixels already present in that layer remain untouched.
objects['head-body'][root_removed&cold]=original[root_removed&cold]
objects['sleeve-roots'][right_region,3]=np.minimum(root_before[right_region],cuff_keep[right_region])
cuff_visible=(objects['sleeve-roots'][:,:,3]>0)&right_region
objects['head-body'][cuff_visible,:3]=ai[cuff_visible,:3]
objects['head-body'][cuff_visible,3]=original[cuff_visible,3]

# The old coarse layer stopped a few pixels inside the original red palm
# outline. Complete that entire silhouette, including its antialiased edge,
# before compositing the new independent palm; otherwise a ghost arc remains.
full_palm_underpaint=np.zeros((h,w),bool)
for name in ['mouse-hand','keyboard-hand']:
 p=meta[name];x=max(0,p['x']-12);y=max(0,p['y']-12);x1=min(w,p['x']+p['width']+12);y1=min(h,p['y']+p['height']+12)
 rgb=original[y:y1,x:x1,:3].astype(np.int32)
 skin=(rgb[:,:,0]>190)&(rgb[:,:,1]>150)&(rgb[:,:,2]>130)&(rgb[:,:,0]>=rgb[:,:,1]-2)&(rgb[:,:,0]>rgb[:,:,2]+2)&(rgb[:,:,0]<rgb[:,:,1]+75)
 palm=fill_holes(largest(skin));palm=np.array(Image.fromarray((palm*255).astype('uint8')).filter(ImageFilter.MaxFilter(13)))>0
 region=np.zeros((h,w),bool);region[y:y1,x:x1]=palm;full_palm_underpaint|=region
 objects['head-body'][region,:3]=ai[region,:3];objects['head-body'][region,3]=original[region,3]
 objects['sleeve-roots'][region,3]=0

eye_reports={}
for side in ['left','right']:
 iris='iris-'+side;eye='eye-'+side;lid='lid-'+side;p=meta[iris]
 old=objects[iris][:,:,3]>0;rgb=original[:,:,:3].astype(np.int32)
 # The lower red eyelid belongs to the fixed eye rim, not the iris texture.
 boundary=np.array(Image.fromarray((old*255).astype('uint8')).filter(ImageFilter.MinFilter(11)))==0
 red=(rgb[:,:,0]>rgb[:,:,1]+24)&(rgb[:,:,0]>rgb[:,:,2]+22)
 window=old&~(boundary&red)
 # All pixels inside the fixed eye window retain their original RGB.
 base=original.copy();base[:,:,3]=objects[eye][:,:,3];base[window,3]=0;objects[eye]=base
 objects['head-body'][window,:3]=ai[window,:3];objects['head-body'][window,3]=255
 # Inpaint only the hidden iris perimeter, within the existing mesh bounds.
 x,y,ww,hh=p['x'],p['y'],p['width'],p['height'];valid=window[y:y+hh,x:x+ww].copy()
 tile=original[y:y+hh,x:x+ww,:3].astype(float);known=valid.copy()
 for _ in range(18):
  value=np.zeros_like(tile);count=np.zeros((hh,ww),float)
  for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:
   vv=np.roll(tile,(dy,dx),(0,1));kk=np.roll(known,(dy,dx),(0,1))
   if dy<0:kk[-1,:]=False
   if dy>0:kk[0,:]=False
   if dx<0:kk[:,-1]=False
   if dx>0:kk[:,0]=False
   value+=vv*kk[:,:,None];count+=kk
  grow=~known&(count>0);tile[grow]=value[grow]/count[grow,None];known|=grow
 d=np.zeros((h,w,4),np.uint8);d[y:y+hh,x:x+ww,:3]=np.clip(np.rint(tile),0,255).astype('uint8');d[y:y+hh,x:x+ww,3]=known*255;objects[iris]=d
 # The closed-eye image covers the static white underlayer when closed.
 ep=meta[eye];box=(ep['x'],ep['y'],ep['x']+ep['width'],ep['y']+ep['height'])
 patch=np.zeros((h,w,4),np.uint8);xx,yy,xx1,yy1=box;patch[yy:yy1,xx:xx1]=closed_skin[yy:yy1,xx:xx1]
 patch[yy:yy1,xx:xx1,3]=255
 skin_im=Image.fromarray(patch);skin_im.alpha_composite(Image.fromarray(objects[lid]));objects[lid]=np.array(skin_im)
 meta[lid].update(x=xx,y=yy,width=xx1-xx,height=yy1-yy)
 eye_reports[side]={'redLidPixelsRemovedFromMovingIris':int((old&~window).sum()),'fixedRimAboveIris':True,'closedSkinUnderpaintRetained':True}

order=['head-body','iris-left','iris-right','eye-left','eye-right','lid-left','lid-right','keyboard','mouse','sleeve-roots','mouse-hand','keyboard-hand','bird']
composite=Image.new('RGBA',(w,h));psd=PSDImage.new(mode='RGB',size=(w,h),depth=8);new_layout=[]
for name in order:
 p=meta[name];im=Image.fromarray(objects[name]);box=(p['x'],p['y'],p['x']+p['width'],p['y']+p['height']);tile=im.crop(box);tile.save(OUT/f'{name}.png');p['file']=f'/assets/v10/{name}.png'
 lay=psd.create_pixel_layer(tile,name=name,left=p['x'],top=p['y']);lay.opacity=int(p['opacity']*255)
 if p['opacity']:composite.alpha_composite(tile,(p['x'],p['y']))
 new_layout.append(p)
psd.save(SRC/'YangyangXuanling-Separated-v10.psd');composite.save(SRC/'composition-neutral-v10.png')
(SRC/'layers-v10.json').write_text(json.dumps({'schema':4,'canvas':{'width':w,'height':h},'layers':new_layout},indent=2)+'\n')
before=np.array(Image.open(SRC/'composition-neutral-v9.png'));diff=np.any(np.array(composite)!=before,axis=2)
allowed=np.zeros((h,w),bool)
for name in ['mouse-hand','keyboard-hand','eye-left','eye-right']:
 p=meta[name];allowed[p['y']:p['y']+p['height'],p['x']:p['x']+p['width']]=True
allowed|=(gap_alpha>0)|root_removed|cuff_visible|full_palm_underpaint
report={'hands':hand_reports,'eyes':eye_reports,'paperGapPixels':int((gap_alpha>0).sum()),'keyboardCuffExcludedPixels':int(root_removed.sum()),'neutralRgbaChanges':int(diff.sum()),'neutralChangesOutsideAuthorizedMasks':int((diff&~allowed).sum()),'nativeImport':'pending'}
assert not (diff&~allowed).any(),report
(ROOT/'docs/palms-eyes-v10.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
