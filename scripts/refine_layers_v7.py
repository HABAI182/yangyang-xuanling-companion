"""Local original-pixel separation. AI is consumed ONLY underneath occluders.

The user explicitly selected pixel cutouts with hidden-area inpainting.
Never run this against an old release or silently update the active model.
"""
from pathlib import Path
import os, sys, json, shutil
if os.environ.get('PET_PSD_TOOLS'): sys.path.insert(0, os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art/source'; OUT=ROOT/'public/assets/v7'; OUT.mkdir(exist_ok=True)
W,H=1536,1360
original=Image.open(SRC/'composition-neutral-v6.png').convert('RGBA')
arr=np.array(original)
ai=Image.open(SRC/'occlusion-underpaint-ai-v7.png').convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
aiarr=np.array(ai)
def poly(points):
    im=Image.new('L',(W,H));ImageDraw.Draw(im).polygon(points,fill=255);return im
def full(layer):
    im=Image.new('RGBA',(W,H));im.alpha_composite(Image.open(ROOT/('public'+layer['file'])),(layer['x'],layer['y']));return im
old=json.loads((SRC/'layers-v6.json').read_text())
objects={l['id']:full(l) for l in old['layers']}
old_masks={k:np.array(v.getchannel('A'))>0 for k,v in objects.items()}

palms={
 'mouse-hand':[(239,1062),(239,1054),(248,1038),(263,1023),(280,1009),(303,999),(328,992),(352,991),(375,997),(394,1009),(408,1028),(417,1047),(420,1062),(415,1078),(406,1088),(392,1097),(377,1099),(362,1094),(350,1085),(339,1089),(327,1087),(313,1080),(302,1087),(288,1085),(273,1075),(264,1081),(253,1079),(243,1072)],
 'keyboard-hand':[(856,1089),(856,1071),(865,1047),(878,1030),(896,1017),(917,1012),(938,1015),(960,1023),(982,1038),(1002,1059),(1015,1081),(1024,1100),(1021,1114),(1013,1126),(1001,1131),(986,1134),(971,1129),(960,1126),(949,1130),(930,1127),(918,1122),(907,1129),(892,1128),(875,1121),(861,1111)]}
hand_masks={k:np.array(poly(p).filter(ImageFilter.MaxFilter(5)))>0 for k,p in palms.items()}
# Return every sleeve/hair/face pixel from the coarse former hand polygons to
# the stationary parent. The moving images contain palm and its contour only.
head=arr.copy()
remove=old_masks['eye-left']|old_masks['eye-right']|old_masks['keyboard']|old_masks['mouse']|old_masks['bird']
head[remove,3]=0
for k,mask in hand_masks.items():
    head[mask,:3]=aiarr[mask,:3];head[mask,3]=arr[mask,3]
    data=arr.copy();data[:,:,3]=np.where(mask,arr[:,:,3],0);objects[k]=Image.fromarray(data)
# Reuse the previously verified hidden eye skin, which is only exposed closed.
prev=np.array(objects['head-body']);eye_masks=old_masks['eye-left']|old_masks['eye-right']
head[eye_masks]=prev[eye_masks]
# A bird's left edge overlaps hair. Complete it only under its old silhouette.
bird_fill=(np.array(objects['bird'].getchannel('A').filter(ImageFilter.MinFilter(5)))==255)&(aiarr[:,:,3]>200)
head[bird_fill]=aiarr[bird_fill]
objects['head-body']=Image.fromarray(head)
# Fixed sleeve roots must occlude the completed mouse, while the clean palm is
# the only object that slides. These source pixels never travel with a hand.
roots=(old_masks['mouse-hand']|old_masks['keyboard-hand'])&~(hand_masks['mouse-hand']|hand_masks['keyboard-hand'])
roots&=(arr[:,:,3]==255)|(head[:,:,3]==0)
fixed=arr.copy();fixed[:,:,3]=np.where(roots,arr[:,:,3],0)
objects['sleeve-roots']=Image.fromarray(fixed)

irises={
 'iris-left':[(545,831),(542,813),(544,791),(550,775),(560,760),(574,751),(591,748),(611,751),(631,759),(649,771),(663,787),(673,804),(677,825),(671,845),(660,861),(646,870),(625,866),(604,862),(582,861),(561,859),(551,848)],
 'iris-right':[(854,897),(851,880),(856,858),(866,841),(881,829),(898,825),(916,827),(939,834),(961,845),(979,861),(988,883),(988,903),(979,924),(965,944),(950,951),(930,944),(913,936),(894,932),(877,928),(861,925)]}
for k,p in irises.items():
    mask=np.array(poly(p))>0
    data=arr.copy();data[:,:,3]=np.where(mask,arr[:,:,3],0);objects[k]=Image.fromarray(data)
    name=k.replace('iris','eye');base=np.array(objects[name])
    # AI supplies textured white sclera; original iris covers it at neutral.
    base[mask,:3]=aiarr[mask,:3];base[mask,3]=255;objects[name]=Image.fromarray(base)

# Remove only the high-luminance paper fringe in a 2px EXTERNAL contour band.
# Internal feathers, hair shine, skin, iris RGB and original proportions stay.
alpha=Image.fromarray(arr[:,:,3]);inner=np.array(alpha.filter(ImageFilter.MinFilter(5)))
edge=(arr[:,:,3]>0)&(inner==0)
light=(arr[:,:,:3].min(2)>186)&(arr[:,:,:3].max(2)-arr[:,:,:3].min(2)<55)
fringe=edge&light
# Trim only the already clipped tiny left tip, <= 9px from the canvas edge.
hair_trim=np.array(poly([(0,921),(0,951),(9,937),(5,931)]))>0
allowed=fringe|hair_trim
for k,im in objects.items():
    d=np.array(im);d[allowed,3]=0;objects[k]=Image.fromarray(d)

order=['head-body','eye-left','eye-right','iris-left','iris-right','lid-left','lid-right','keyboard','mouse','sleeve-roots','mouse-hand','keyboard-hand','bird']
layers=[];composite=Image.new('RGBA',(W,H));psd=PSDImage.new(mode='RGB',size=(W,H),depth=8)
for k in order:
    im=objects[k];box=im.getchannel('A').getbbox();crop=im.crop(box);crop.save(OUT/f'{k}.png')
    x,y,x1,y1=box;opacity=0 if k.startswith('lid-') else 1
    lay=psd.create_pixel_layer(crop,name=k,top=y,left=x);lay.opacity=255*opacity
    if opacity:composite.alpha_composite(crop,(x,y))
    layers.append(dict(id=k,file=f'/assets/v7/{k}.png',x=x,y=y,width=x1-x,height=y1-y,opacity=opacity))
psd.save(SRC/'YangyangXuanling-Separated-v7.psd')
composite.save(SRC/'composition-neutral-v7.png')
layout=dict(schema=3,canvas=dict(width=W,height=H),layers=layers)
(SRC/'layers-v7.json').write_text(json.dumps(layout,indent=2)+'\n')
diff=np.any(np.array(composite)!=arr,axis=2);outside=int((diff&~allowed).sum())
report=dict(canvas=[W,H],neutralChangesOutsideAuthorizedEdgeAndHairMask=outside,
            fringePixels=int(fringe.sum()),hairTrimPixels=int((hair_trim&(arr[:,:,3]>0)).sum()),
            movingHandBounds={k:list(objects[k].getchannel('A').getbbox()) for k in palms},
            originalIrisRgbPreserved=True,aiRestrictedToHiddenAreas=True,
            nativeImport='pending',visualAcceptance='pending')
(ROOT/'docs/art-refinement-v7.json').write_text(json.dumps(report,indent=2)+'\n')
for bg,name in [((35,36,43,255),'dark'),((245,245,245,255),'light')]:
    view=Image.new('RGBA',(W,H),bg);view.alpha_composite(composite);view.save(ROOT/f'art/edge-v7-{name}.png')
print(json.dumps(report))
