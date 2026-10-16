"""Small pixel repairs for the v11 native model; this is NOT a new MOC export.

The 16px hair extension reflects nearby source colour only outside the old
canvas. Mouth underpaint is local harmonic interpolation from adjacent skin.
Every existing neutral visible pixel is retained. No whole-image AI redraw.
"""
from pathlib import Path
import json, os, sys
import numpy as np
from PIL import Image
if os.environ.get('PET_PSD_TOOLS'): sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[1]; SRC=ROOT/'art/source'
OUT=ROOT/'public/assets/detail-v12';OUT.mkdir(exist_ok=True)
original=np.array(Image.open(SRC/'composition-neutral-v11.png').convert('RGBA'))

# Keep the whole old silhouette. Add only a narrow, curved continuation of
# the blue strand where the old canvas had cut straight through it.
box=(-20,950,6,1080); x0,y0,x1,y1=box
patch=np.zeros((y1-y0,x1-x0,4),dtype='uint8')
for y in range(y0,y1):
    # A transparent source row supplies no colour and must not grow a black
    # fringe outside the canvas near the two ends of the continuation.
    if original[y,0,3]<250: continue
    t=(y-y0)/(y1-y0-1); width=16*np.sin(np.pi*t)**.8
    for x in range(x0,0):
        coverage=np.clip(x+width+.5,0,1)
        if coverage==0: continue
        sample=(original[y,0,:3].astype(float)+x*.6*(original[y,10,:3].astype(float)-original[y,0,:3])/10).clip(0,255)
        # An antialiased dark contour continues the existing strand outline.
        edge=np.clip(1-(x+width)/1.8,0,1)
        outline=sample*.56
        rgb=sample*(1-edge)+outline*edge
        patch[y-y0,x-x0,:3]=np.rint(rgb).astype('uint8')
        patch[y-y0,x-x0,3]=round(255*coverage)
for y in range(y0,y1):
    for x in range(0,x1):
        if original[y,x,3]==255:patch[y-y0,x-x0]=original[y,x]
Image.fromarray(patch).save(OUT/'hair-tip.png')

# Remove only the original open mouth when a different expression is active.
# Boundary skin is fixed throughout diffusion; neutral uses the untouched atlas.
mouth_box=(704,922,760,976); mx,my,mx1,my1=mouth_box
tile=original[my:my1,mx:mx1,:3].astype(float)
yy,xx=np.mgrid[my:my1,mx:mx1]
r=((xx-731)/22.5)**2+((yy-949)/22.5)**2
mask=r<1.13
tile[mask]=tile[~mask].mean(axis=0)
for _ in range(1600):
    mean=(np.roll(tile,1,0)+np.roll(tile,-1,0)+np.roll(tile,1,1)+np.roll(tile,-1,1))/4
    tile[mask]=mean[mask]
rgba=np.zeros((*tile.shape[:2],4),dtype='uint8');rgba[:,:,:3]=tile.round().clip(0,255)
rgba[:,:,3]=np.rint(np.clip((1.08-r)/.14,0,1)*255)
Image.fromarray(rgba).save(OUT/'mouth-skin.png')

layout=json.loads((SRC/'layers-v11.json').read_text(encoding='utf-8'))
psd=PSDImage.new(mode='RGB',size=(1584,1360),depth=8)
for p in layout['layers']:
    im=Image.open(ROOT/('public'+p['file']))
    layer=psd.create_pixel_layer(im,name=p['id'],left=p['x']+24,top=p['y'])
    layer.opacity=round(p['opacity']*255)
psd.create_pixel_layer(Image.fromarray(patch),name='hair-tip-runtime',left=x0+24,top=y0)
layer=psd.create_pixel_layer(Image.fromarray(rgba),name='mouth-skin-runtime',left=mx+24,top=my);layer.opacity=0
psd.save(SRC/'YangyangXuanling-Details-v12.psd')

meta={'schema':1,'nativeBase':'yangyang-v11','nativeExportModified':False,
      'viewBox':[-24,0,1584,1360],'patches':[
        {'id':'hair-tip','file':'/assets/detail-v12/hair-tip.png','box':list(box),'always':True},
        {'id':'mouth-skin','file':'/assets/detail-v12/mouth-skin.png','box':list(mouth_box),'always':False}],
      'binding':'cached barycentric weights on native head triangles',
      'neutralExistingPixelChanges':0,'hairMaxExtensionSourcePx':16,
      'nativePsd':'YangyangXuanling-Separated-v11.psd',
      'supplementPsd':'YangyangXuanling-Details-v12.psd'}
(OUT/'patches.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
(ROOT/'docs/detail-patches-v12.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
preview=Image.new('RGBA',(1584,1360));preview.alpha_composite(Image.fromarray(original),(24,0));preview.alpha_composite(Image.fromarray(patch),(x0+24,y0))
preview.save(SRC/'composition-detail-v12.png')
assert np.array_equal(np.array(preview)[:,24:1560],original)
print(json.dumps(meta))

if __name__=='__main__': pass
