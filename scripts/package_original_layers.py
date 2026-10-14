"""Preserve source geometry/RGB. Use AI only beneath source hands and eyes.
Local pixel processing was explicitly selected by the user on 2026-10-14.
"""
from pathlib import Path
import os,sys,json,hashlib
import argparse
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image,ImageDraw,ImageChops
from psd_tools import PSDImage

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--version',choices=['v2','v3','v4'],default='v4');args=parser.parse_args()
VERSION=args.version
SRC=ROOT/'art/source';OUT=ROOT/f'public/assets/{VERSION}';OUT.mkdir(parents=True,exist_ok=True)
source=Image.open(SRC/f'original-pixel-cutout-{VERSION}.png').convert('RGBA')
width,height=1536,1360
source=source.crop((0,0,width,height));original=np.array(source)
ai=Image.open(SRC/'hidden-underpaint-v2.png').convert('RGBA').resize((1536,1536),Image.Resampling.LANCZOS).crop((0,0,width,height))
ai_data=np.array(ai)
polygons={
 'keyboard':[(439,1108),(1354,1108),(1392,1159),(1432,1230),(1455,1267),(1454,1289),(1438,1300),(362,1300),(345,1286),(346,1254),(383,1198)],
 'mouse':[(204,1079),(248,1061),(325,1055),(389,1056),(417,1075),(428,1100),(418,1138),(397,1161),(362,1187),(298,1203),(236,1201),(186,1189),(157,1172),(155,1157),(165,1128),(187,1098)],
 'mouse-hand':[(210,1045),(254,999),(298,974),(344,956),(390,952),(433,960),(468,981),(483,1019),(501,1060),(481,1095),(438,1102),(407,1090),(387,1099),(325,1107),(284,1096),(246,1084),(222,1074)],
 'keyboard-hand':[(851,1065),(862,1031),(892,1018),(938,1015),(980,1031),(1010,1009),(1061,990),(1110,1001),(1153,1037),(1167,1081),(1147,1108),(1080,1108),(1027,1097),(1018,1126),(987,1133),(950,1127),(914,1129),(879,1120),(857,1103)],
 'bird':[(1215,1043),(1229,1019),(1245,988),(1274,964),(1304,946),(1338,950),(1366,931),(1434,926),(1464,941),(1471,973),(1458,1004),(1479,1016),(1505,999),(1522,975),(1534,1007),(1533,1051),(1512,1091),(1483,1119),(1440,1136),(1378,1140),(1300,1136),(1267,1117),(1242,1086),(1220,1065)],
 'eye-left':[(489,738),(528,716),(587,711),(632,722),(666,739),(692,768),(696,805),(672,849),(637,877),(580,895),(537,884),(504,859),(486,817)],
 'eye-right':[(833,850),(865,815),(912,801),(961,808),(1003,824),(1026,851),(1028,901),(1000,941),(947,970),(890,964),(845,936),(830,891)],
}
def mask_poly(points):
    m=Image.new('L',(width,height));ImageDraw.Draw(m).polygon(points,fill=255);return np.array(m)>0
masks={name:mask_poly(poly) for name,poly in polygons.items()}
alpha=original[:,:,3]
eyes=masks['eye-left']|masks['eye-right'];hands=masks['mouse-hand']|masks['keyboard-hand']
devices=masks['keyboard']|masks['mouse']|masks['bird']
head_data=original.copy()
head_data[:,:,3]=np.where(~(eyes|hands|devices),alpha,0)
# The AI colors only become visible in areas previously concealed by layers.
fill=(eyes|hands)&~devices&(np.indices((height,width))[0]<1110)&(ai_data[:,:,3]>128)
head_data[fill,:3]=ai_data[fill,:3];head_data[fill,3]=255
objects={'head-body':Image.fromarray(head_data)}
for name in ['keyboard','mouse']:
    data=original.copy();sel=masks[name]
    data[:,:,3]=np.where(sel,alpha,0)
    hidden=sel&hands&(ai_data[:,:,3]>128)
    data[hidden,:3]=ai_data[hidden,:3];data[hidden,3]=255
    objects[name]=Image.fromarray(data)
for name in ['eye-left','eye-right','mouse-hand','keyboard-hand','bird']:
    data=original.copy();data[:,:,3]=np.where(masks[name],alpha,0);objects[name]=Image.fromarray(data)
# Keep original eyelashes as two additional hidden-at-rest meshes. Geometry and
# opacity for their blink poses are authored separately in Cubism.
for side in ['left','right']:
    eye=masks[f'eye-{side}'];ys=np.indices((height,width))[0]
    lash=eye&(original[:,:,0]>original[:,:,1]*1.12)&(original[:,:,0]>=original[:,:,2]*.85)&(original[:,:,1]<90)&(ys<(785 if side=='left' else 865))
    data=original.copy();data[:,:,3]=np.where(lash,alpha,0);objects[f'lid-{side}']=Image.fromarray(data)

order=['head-body','eye-left','eye-right','lid-left','lid-right','keyboard','mouse','mouse-hand','keyboard-hand','bird']
layers=[];composite=Image.new('RGBA',(width,height));psd=PSDImage.new(mode='RGB',size=(width,height),depth=8)
for name in order:
    im=objects[name];box=im.getchannel('A').getbbox()
    if not box:raise ValueError(f'Empty {name}')
    cropped=im.crop(box);cropped.save(OUT/f'{name}.png')
    x,y,x1,y1=box;opacity=0 if name.startswith('lid-') else 1
    layer=psd.create_pixel_layer(cropped,name=name,top=y,left=x);layer.opacity=int(255*opacity)
    if opacity:composite.alpha_composite(cropped,(x,y))
    layers.append({'id':name,'file':f'/assets/{VERSION}/{name}.png','x':x,'y':y,'width':x1-x,'height':y1-y,'opacity':opacity})
psd_name='YangyangXuanling-OriginalPixels-v2.psd' if VERSION=='v2' else f'YangyangXuanling-OfficialIris-{VERSION}.psd'
psd.save(SRC/psd_name)
reopened=PSDImage.open(SRC/psd_name)
if len(reopened)!=len(layers):raise ValueError('PSD layer count mismatch')
composite.save(SRC/f'composition-original-{VERSION}.png')
actual=np.array(composite);protected=(alpha==255)&~(hands|eyes)
changed=int(np.any(actual[:,:,:3]!=original[:,:,:3],axis=2)[protected].sum())
reference_changed=int(np.any(actual[:,:,:3]!=original[:,:,:3],axis=2)[alpha==255].sum())
layout={'schema':2,'draft':True,'sourcePixelsPreserved':True,'irisColorVersion':VERSION,'canvas':{'width':width,'height':height},'layers':layers}
(ROOT/'public/assets/layers.json').write_text(json.dumps(layout,indent=2)+'\n',encoding='utf-8')
report={'sourceSize':[1536,1536],'cropOnlyCanvas':[width,height],'layerCount':len(layers),'protectedRgbChangedPixels':changed,'neutralRgbChangedPixels':reference_changed,'aiOnlyInHiddenMasks':True,'geometryResamplingOfVisibleSource':False,'psdRoundTripLayers':len(reopened),'artAcceptance':'pending edge, separation and pose QA','sourceSha256':hashlib.sha256((SRC/'skill-layout-reference.png').read_bytes()).hexdigest()}
(ROOT/f'docs/pixel-preservation-{VERSION}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
