"""Localized, deterministic iris correction explicitly requested by the user.

The original pixels outside the two iris masks must remain byte-identical.
Reference: official KURO profile 5007, portrait panel 1, downloaded from the
official article JSON. Palette is an artistic reading, not an official hex spec.
"""
from pathlib import Path
import os,sys,json,hashlib,colorsys,argparse
if os.environ.get('PET_PSD_TOOLS'): sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image,ImageDraw,ImageFilter

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--version',choices=['v3','v4'],default='v4');args=parser.parse_args()
VERSION=args.version
SRC=ROOT/'art/source'
im=Image.open(SRC/'original-pixel-cutout-v2.png').convert('RGBA')
a=np.array(im); rgb=a[:,:,:3].astype(float)/255
hsv=np.array(im.convert('RGB').convert('HSV')).astype(float)/255
H,W=a.shape[:2]; yy,xx=np.indices((H,W))
regions=[
    {'side':'left','polygon':[(553,750),(587,748),(628,752),(660,770),(677,799),(675,836),(660,862),(631,883),(587,889),(547,871),(538,837),(539,798),(544,770)],'top':750,'bottom':890,'pupil':[614,811,28,38]},
    {'side':'right','polygon':[(871,834),(906,820),(950,828),(979,850),(994,878),(994,910),(976,939),(948,958),(911,955),(870,935),(854,910),(851,880),(856,852)],'top':823,'bottom':959,'pupil':[921,891,27,36]},
]
mask=np.zeros((H,W),bool); result=a.copy(); statistics=[]
for region in regions:
    m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon(region['polygon'],fill=255)
    # Select source blue/cyan pigment; preserve white specular highlights,
    # eyelash/skin pixels and all alpha without resampling source geometry.
    pigment=(np.array(m)>0)&(hsv[:,:,0]>.48)&(hsv[:,:,0]<.71)&(hsv[:,:,1]>.13)&(a[:,:,3]>0)
    t=np.clip((yy-region['top'])/(region['bottom']-region['top']),0,1)
    target_h=((207-14*t) if VERSION=='v3' else (224-9*t))/360
    target_s=hsv[:,:,1]*((.36+.50*t) if VERSION=='v3' else (.50+.20*t))
    target_v=hsv[:,:,2]*(.86+.14*t)
    ii=np.where(pigment)
    values=[colorsys.hsv_to_rgb(float(h),float(s),float(v)) for h,s,v in zip(target_h[ii],target_s[ii],target_v[ii])]
    recolored=np.clip(np.rint(np.array(values)*255),0,255).astype('uint8')
    result[ii[0],ii[1],:3]=recolored
    # Recolor only the existing lower iris/pupil rim to muted pale gold.
    cx,cy,rx,ry=region['pupil']; radius=np.sqrt(((xx-cx)/rx)**2+((yy-cy)/ry)**2)
    rim=pigment&(radius>.94)&(radius<1.14)&(yy>cy+13)&(hsv[:,:,2]>.43)
    blend=np.clip(1-np.abs(radius-1.04)/.10,0,1)*.75
    gold=np.array([213,202,157.])
    ri=np.where(rim); base=result[ri[0],ri[1],:3].astype(float)
    weight=blend[ri][:,None]
    result[ri[0],ri[1],:3]=np.rint(base*(1-weight)+gold*weight).astype('uint8')
    mask|=pigment
    statistics.append({'side':region['side'],'pigmentPixels':int(pigment.sum()),'goldRimPixels':int(rim.sum())})

changed=np.any(result!=a,axis=2)
outside=int((changed&~mask).sum())
if outside:raise AssertionError(f'{outside} protected pixels changed')
if not np.array_equal(result[:,:,3],a[:,:,3]):raise AssertionError('Alpha changed')
Image.fromarray(result).save(SRC/f'original-pixel-cutout-{VERSION}.png')
Image.fromarray(mask.astype('uint8')*255).save(SRC/f'iris-color-mask-{VERSION}.png')
palette='gray-blue upper iris, pale cyan lower iris, muted pale-gold lower pupil rim' if VERSION=='v3' else 'muted gray-blue iris; remove cyan/green cast per user feedback; preserve subtle muted gold rim'
report={'version':VERSION,'officialPage':'https://wutheringwaves.kurogames.com/en/main/news/detail/5007','referencePanel':'art/references/official-profile-5007-1.png','paletteInterpretation':palette,'visibleChangedPixels':int(changed.sum()),'outsideIrisChangedPixels':outside,'alphaChangedPixels':0,'visibleGeometryResampled':False,'regions':statistics,'beforeSha256':hashlib.sha256((SRC/'original-pixel-cutout-v2.png').read_bytes()).hexdigest(),'afterSha256':hashlib.sha256((SRC/f'original-pixel-cutout-{VERSION}.png').read_bytes()).hexdigest()}
(ROOT/f'docs/iris-correction-{VERSION}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
