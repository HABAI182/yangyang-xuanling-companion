"""Composite AI repair only into hidden eye masks, retaining all visible pixels."""
import json,os,sys,shutil,hashlib
from pathlib import Path
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image,ImageDraw
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[1]
layout=json.loads((ROOT/'public/assets/layers.json').read_text(encoding='utf-8'))
assert layout['irisColorVersion']=='v4'
out=ROOT/'public/assets/v6';out.mkdir(parents=True,exist_ok=True)
head=layout['layers'][0];assert head['id']=='head-body'
old=Image.open(ROOT/'public/assets/v4/head-body.png').convert('RGBA')
ai=Image.open(ROOT/'art/source/eye-underpaint-ai-v6.png').convert('RGBA').resize(old.size,Image.Resampling.LANCZOS)
polygons=[[(489,738),(528,716),(587,711),(632,722),(666,739),(692,768),(696,805),(672,849),(637,877),(580,895),(537,884),(504,859),(486,817)],[(833,850),(865,815),(912,801),(961,808),(1003,824),(1026,851),(1028,901),(1000,941),(947,970),(890,964),(845,936),(830,891)]]
mask=Image.new('L',old.size)
for polygon in polygons:ImageDraw.Draw(mask).polygon([(x-head['x'],y-head['y']) for x,y in polygon],fill=255)
selection=np.array(mask)>0
before=np.array(old);generated=np.array(ai);after=before.copy()

# Match the neighboring skin, excluding dark lashes/hair from the boundary
# colors so they cannot diffuse into a gray eye socket. Alpha is never replaced.
for polygon in polygons:
    local=[(x-head['x'],y-head['y']) for x,y in polygon]
    x0=max(0,min(x for x,y in local)-14);y0=max(0,min(y for x,y in local)-14)
    x1=min(old.width,max(x for x,y in local)+15);y1=min(old.height,max(y for x,y in local)+15)
    inside=selection[y0:y1,x0:x1]
    source=generated[y0:y1,x0:x1,:3].astype(np.float32)
    target=before[y0:y1,x0:x1,:3].astype(np.float32)
    skin=(target[:,:,0]>210)&(target[:,:,1]>165)&(target[:,:,2]>150)&(source[:,:,0]>210)&(source[:,:,1]>165)&(source[:,:,2]>150)&(target[:,:,0]>=target[:,:,2])&~inside
    difference=target-source
    mean=difference[skin].mean(axis=0) if skin.any() else np.zeros(3,dtype=np.float32)
    correction=np.empty_like(source);correction[:]=mean
    correction[skin]=difference[skin]
    for n in range(1400):
        average=(np.roll(correction,1,0)+np.roll(correction,-1,0)+np.roll(correction,1,1)+np.roll(correction,-1,1))*.25
        correction[inside]=average[inside]
    repaired=np.clip(np.rint(source+correction),0,255).astype(np.uint8)
    after[y0:y1,x0:x1,:3][inside]=repaired[inside]

assert np.array_equal(after[~selection],before[~selection])
assert np.array_equal(after[:,:,3],before[:,:,3])
Image.fromarray(after).save(out/'head-body.png')
mask.save(ROOT/'art/source/eye-underpaint-mask-v6.png')
canvas=(layout['canvas']['width'],layout['canvas']['height'])
neutral=Image.new('RGBA',canvas);previous=Image.new('RGBA',canvas);closed=Image.new('RGBA',canvas)
psd=PSDImage.new(mode='RGB',size=canvas,depth=8)
for item in layout['layers']:
    name=item['id'];old_path=ROOT/'public'/item['file'].lstrip('/')
    if name!='head-body':shutil.copy2(old_path,out/f'{name}.png')
    image=Image.open(out/f'{name}.png').convert('RGBA')
    layer=psd.create_pixel_layer(image,name=name,top=item['y'],left=item['x']);layer.opacity=round(item['opacity']*255)
    if item['opacity']:
        neutral.alpha_composite(image,(item['x'],item['y']))
        previous.alpha_composite(Image.open(old_path).convert('RGBA'),(item['x'],item['y']))
        if not name.startswith('eye-'):closed.alpha_composite(image,(item['x'],item['y']))
    item['file']=f'/assets/v6/{name}.png'
assert np.array_equal(np.array(neutral),np.array(previous)), 'Visible neutral art must remain unchanged'
psd_path=ROOT/'art/source/YangyangXuanling-EyeUnderpaint-v6.psd';psd.save(psd_path)
assert len(PSDImage.open(psd_path))==10
neutral.save(ROOT/'art/source/composition-neutral-v6.png')
closed.save(ROOT/'art/source/hidden-eye-fill-preview-v6.png')
layout['hiddenUnderpaintVersion']='v6';layout['irisColorVersion']='v4'
(ROOT/'art/source/layers-v6.json').write_text(json.dumps(layout,indent=2)+'\n',encoding='utf-8')
report={'version':'v6','purpose':'hidden eye-socket seam repair','maskPixels':int(selection.sum()),'changedPixels':int(np.any(after!=before,axis=2).sum()),'outsideMaskChangedPixels':int(np.any(after!=before,axis=2)[~selection].sum()),'alphaChangedPixels':int((after[:,:,3]!=before[:,:,3]).sum()),'neutralCompositeChangedPixels':int(np.any(np.array(neutral)!=np.array(previous),axis=2).sum()),'irisLayersUnchanged':True,'canvas':list(canvas),'layerNamesAndPositionsUnchanged':True,'psdLayers':10,'aiSourceSha256':hashlib.sha256((ROOT/'art/source/eye-underpaint-ai-v6.png').read_bytes()).hexdigest(),'sourcePsdSha256':hashlib.sha256(psd_path.read_bytes()).hexdigest(),'status':'PSD prepared; native model replacement/export pending'}
(ROOT/'docs/eye-underpaint-v6.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
