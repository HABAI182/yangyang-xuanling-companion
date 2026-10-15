import {CubismFramework} from '../vendor/live2d/src/live2dcubismframework';
import {CubismMoc} from '../vendor/live2d/src/model/cubismmoc';
import {CubismModel} from '../vendor/live2d/src/model/cubismmodel';
import {CubismModelMatrix} from '../vendor/live2d/src/math/cubismmodelmatrix';
import {CubismMatrix44} from '../vendor/live2d/src/math/cubismmatrix44';
import {CubismRenderer_WebGL} from '../vendor/live2d/src/rendering/cubismrenderer_webgl';
import {CubismShaderManager_WebGL} from '../vendor/live2d/src/rendering/cubismshader_webgl';
import {CubismPhysics} from '../vendor/live2d/src/physics/cubismphysics';
import {loadImage,PetRenderer,AnimationSnapshot,AnimationOptions} from './renderer';

type Config={entry:string|null,parameters:Record<string,string>,parameterScale?:Record<string,number>};
const shaderUrl='/vendor/live2d/shaders/';
let frameworkReady=false;
export class CubismRenderer implements PetRenderer {
  private gl!:WebGLRenderingContext;private moc!:CubismMoc;private model!:CubismModel;private renderer!:CubismRenderer_WebGL;private matrix!:CubismModelMatrix;private physics?:CubismPhysics;private textures:WebGLTexture[]=[];private last=0;
  private restored=new Map<number,Float32Array>();
  constructor(private canvas:HTMLCanvasElement,private config:Config){}
  async load(){
    if(!this.config.entry || !this.config.entry.startsWith('/models/') || this.config.entry.includes('..'))throw new Error('模型入口必须在本地 models 中');
    if(typeof Live2DCubismCore==='undefined')await new Promise<void>((resolve,reject)=>{const el=document.createElement('script');el.src='/vendor/live2d/live2dcubismcore.min.js';el.onload=()=>typeof Live2DCubismCore!=='undefined'?resolve():reject(new Error('Core 未初始化'));el.onerror=()=>reject(new Error('Core 加载失败'));document.head.append(el);});
    if(!frameworkReady){if(!CubismFramework.startUp())throw new Error('Cubism 启动失败');CubismFramework.initialize();frameworkReady=true;}
    const url=this.config.entry;const response=await fetch(url);if(!response.ok)throw new Error('模型入口读取失败');const manifest=await response.json();
    const base=url.slice(0,url.lastIndexOf('/')+1);
    const local=(file:string)=>{if(file.startsWith('/') || file.includes('..') || file.includes(':'))throw new Error('模型引用越界');return base+file;};
    const refs=manifest.FileReferences;const data=await (await fetch(local(refs.Moc))).arrayBuffer();
    this.moc=CubismMoc.create(data,true);if(!this.moc)throw new Error('真实 MOC3 验证失败');this.model=this.moc.createModel();if(!this.model)throw new Error('模型创建失败');
    this.canvas.height=1360;this.canvas.width=Math.round(1360*this.model.getCanvasWidth()/this.model.getCanvasHeight());this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true})!;if(!this.gl)throw new Error('WebGL 不可用');
    this.model.saveParameters();this.matrix=new CubismModelMatrix(this.model.getCanvasWidth(),this.model.getCanvasHeight());
    if(manifest.Layout)this.matrix.setupFromLayout(new Map(Object.entries(manifest.Layout) as [string,number][]));
    this.renderer=new CubismRenderer_WebGL(this.canvas.width,this.canvas.height);this.renderer.initialize(this.model);this.renderer.startUp(this.gl);this.renderer.setIsPremultipliedAlpha(true);this.renderer.loadShaders(shaderUrl);
    for(const [i,file] of refs.Textures.entries()){const im=await loadImage(local(file));const gl=this.gl;const tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);this.textures.push(tex);this.renderer.bindTexture(i,tex);}
    if(refs.Physics){const d=await (await fetch(local(refs.Physics))).arrayBuffer();this.physics=CubismPhysics.create(d,d.byteLength);}
    const deadline=performance.now()+10000;while(!CubismShaderManager_WebGL.getInstance().getShader(this.gl)._isShaderLoaded){if(performance.now()>deadline)throw new Error('着色器未完成加载');await new Promise(r=>setTimeout(r,16));}
  }
  private set(semantic:string,value:number){const id=this.config.parameters[semantic];if(!id)return;const manager=CubismFramework.getIdManager();const parameter=manager.getId(id);const index=this.model.getParameterIndex(parameter);
    // Unknown IDs must never silently manufacture usable model parameters.
    if(index<0||index>=this.model.getParameterCount())return;this.model.setParameterValueByIndex(index,value*(this.config.parameterScale?.[semantic]??1));}
  draw(now:number,s:AnimationSnapshot,g:{x:number,y:number},intensity:number,idle:boolean,options?:AnimationOptions){const dt=this.last?Math.min((now-this.last)/1000,.1):1/60;this.last=now;
    // Restore the exact Core output before its next update: runtime transforms
    // must never accumulate into a progressively stretched model.
    for(const [i,vertices] of this.restored)this.model.getDrawableVertexPositions(i).set(vertices);this.restored.clear();this.model.loadParameters();
    this.set('headX',g.x*8);this.set('headY',-g.y*5);this.set('headZ',g.x*2+(s.keyboardBounce+s.mouseBounce)*2*intensity);
    this.set('keyboardPress',(s.keyboardPress*.82+s.keyboardBounce*.18)*intensity*(options?.keyboardScale??1));this.set('mousePress',(s.mousePress*.82+s.mouseBounce*.18)*intensity*(options?.mouseScale??1));this.set('keyboardReach',s.reach*s.keyboardPress);
    this.set('breath',idle?.5+.5*Math.sin(now/800):.5);this.set('birdBounce',(s.keyboardBounce+s.mouseBounce)*intensity);
    // This model has opacity-bound open/closed art. A short closed hold avoids
    // the double image produced by crossfading the entire eye patches.
    const phase=now%5700;const closed=['sleepy','laugh','shy'].includes(options?.expression??'');const open=closed||idle&&phase>5460&&phase<5590?0:1;this.set('eyeLeftOpen',open);this.set('eyeRightOpen',open);
    this.physics?.evaluate(this.model,dt);this.model.update();
    if(options)this.runtimeMotion(now,s,g,intensity,idle,options);
    const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const m=new CubismMatrix44();const aspect=this.canvas.width/this.canvas.height;if(aspect>=1)m.scale(1/aspect,1);else m.scale(1,aspect);m.multiplyByMatrix(this.matrix);
    this.renderer.setMvpMatrix(m);this.renderer.setRenderState(null as unknown as WebGLFramebuffer,[0,0,this.canvas.width,this.canvas.height]);this.renderer.drawModel(shaderUrl);
  }
  private runtimeMotion(now:number,s:AnimationSnapshot,g:{x:number,y:number},intensity:number,idle:boolean,o:AnimationOptions){
    const cw=this.model.getCanvasWidth(),ch=this.model.getCanvasHeight(),level=o.motionLevel;
    const pulse=(s.keyboardBounce+s.mouseBounce)*intensity;
    const nod=o.motion==='nod'?Math.sin(o.motionAge/210)*Math.exp(-o.motionAge/1300):0;
    const cheer=o.motion==='cheer'?Math.max(0,Math.sin(o.motionAge/160))*Math.exp(-o.motionAge/1800):0;
    const angle=(g.x*.003+pulse*.006+nod*.012)*o.headElasticity*level;
    const dy=((idle?Math.sin(now/850)*.0006:0)+pulse*.002+cheer*.007+nod*.004)*ch*level;
    const px=-cw*.02,py=-ch*.11,cos=Math.cos(angle),sin=Math.sin(angle);
    for(let i=0;i<this.model.getDrawableCount();i++){
      const id=this.model.getDrawableId(i).getString();
      const head=['ArtMesh5','ArtMesh1','ArtMesh2','ArtMesh3','ArtMesh4'].includes(id);
      const bird=id==='bird';const mouse=id==='mouse'||id==='ArtMesh0';const keyboard=id==='ArtMesh';
      if(!head&&!bird&&!mouse&&!keyboard)continue;
      const vertices=this.model.getDrawableVertexPositions(i);this.restored.set(i,new Float32Array(vertices));
      for(let k=0;k<vertices.length;k+=2){let x=vertices[k],y=vertices[k+1];
        if(head){const dx=x-px,hy=y-py;x=px+dx*cos-hy*sin+g.x*cw*.0015*level;y=py+dx*sin+hy*cos+dy;}
        if(bird){const playful=o.motion==='bird'?Math.sin(o.motionAge/120)*Math.exp(-o.motionAge/2000):0;y+=((idle?Math.sin(now/500)*.0012:0)+playful*.008+cheer*.003)*ch*level;}
        if(mouse){x+=g.x*cw*.002*o.mouseScale;y-=g.y*ch*.001*o.mouseScale;}
        if(keyboard)x+=s.reach*s.keyboardPress*cw*.004*o.keyboardScale;
        vertices[k]=x;vertices[k+1]=y;
      }
    }
  }
  diagnostics(){
    const meshes:Record<string,number>={};for(let i=0;i<this.model.getDrawableCount();i++){let hash=2166136261;for(const n of this.model.getDrawableVertexPositions(i))hash=Math.imul(hash^Math.round(n*1e6),16777619);meshes[this.model.getDrawableId(i).getString()]=hash>>>0;}
    const parameters:Record<string,number>={};for(const semantic of ['keyboardPress','mousePress','eyeLeftOpen','eyeRightOpen']){const id=this.config.parameters[semantic];if(id){const i=this.model.getParameterIndex(CubismFramework.getIdManager().getId(id));parameters[semantic]=this.model.getParameterValueByIndex(i);}}
    return {meshes,parameters};
  }
  dispose(){this.physics?.release();this.renderer?.release();for(const t of this.textures)this.gl.deleteTexture(t);if(this.model)this.moc.deleteModel(this.model);this.moc?.release();}
}
