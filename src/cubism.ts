import {CubismFramework} from '../vendor/live2d/src/live2dcubismframework';
import {CubismMoc} from '../vendor/live2d/src/model/cubismmoc';
import {CubismModel} from '../vendor/live2d/src/model/cubismmodel';
import {CubismModelMatrix} from '../vendor/live2d/src/math/cubismmodelmatrix';
import {CubismMatrix44} from '../vendor/live2d/src/math/cubismmatrix44';
import {CubismRenderer_WebGL} from '../vendor/live2d/src/rendering/cubismrenderer_webgl';
import {CubismShaderManager_WebGL} from '../vendor/live2d/src/rendering/cubismshader_webgl';
import {CubismPhysics} from '../vendor/live2d/src/physics/cubismphysics';
import {loadImage,PetRenderer,AnimationSnapshot} from './renderer';

type Config={entry:string|null,parameters:Record<string,string>};
const shaderUrl='/vendor/live2d/shaders/';
let frameworkReady=false;
export class CubismRenderer implements PetRenderer {
  private gl!:WebGLRenderingContext;private moc!:CubismMoc;private model!:CubismModel;private renderer!:CubismRenderer_WebGL;private matrix!:CubismModelMatrix;private physics?:CubismPhysics;private textures:WebGLTexture[]=[];private last=0;
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
    this.canvas.width=1400;this.canvas.height=1360;this.gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true})!;if(!this.gl)throw new Error('WebGL 不可用');
    this.model.saveParameters();this.matrix=new CubismModelMatrix(this.model.getCanvasWidth(),this.model.getCanvasHeight());
    if(manifest.Layout)this.matrix.setupFromLayout(new Map(Object.entries(manifest.Layout) as [string,number][]));
    this.renderer=new CubismRenderer_WebGL(this.canvas.width,this.canvas.height);this.renderer.initialize(this.model);this.renderer.startUp(this.gl);this.renderer.setIsPremultipliedAlpha(true);this.renderer.loadShaders(shaderUrl);
    for(const [i,file] of refs.Textures.entries()){const im=await loadImage(local(file));const gl=this.gl;const tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);this.textures.push(tex);this.renderer.bindTexture(i,tex);}
    if(refs.Physics){const d=await (await fetch(local(refs.Physics))).arrayBuffer();this.physics=CubismPhysics.create(d,d.byteLength);}
    const deadline=performance.now()+10000;while(!CubismShaderManager_WebGL.getInstance().getShader(this.gl)._isShaderLoaded){if(performance.now()>deadline)throw new Error('着色器未完成加载');await new Promise(r=>setTimeout(r,16));}
  }
  private set(semantic:string,value:number){const id=this.config.parameters[semantic];if(!id)return;const manager=CubismFramework.getIdManager();const parameter=manager.getId(id);const index=this.model.getParameterIndex(parameter);
    // Unknown IDs must never silently manufacture usable model parameters.
    if(index<0||index>=this.model.getParameterCount())return;this.model.setParameterValueByIndex(index,value);}
  draw(now:number,s:AnimationSnapshot,g:{x:number,y:number},intensity:number,idle:boolean){const dt=this.last?Math.min((now-this.last)/1000,.1):1/60;this.last=now;this.model.loadParameters();
    this.set('headX',g.x*8);this.set('headY',-g.y*5);this.set('headZ',g.x*2+(s.keyboardBounce+s.mouseBounce)*2*intensity);
    this.set('keyboardPress',s.keyboardPress*intensity);this.set('mousePress',s.mousePress*intensity);this.set('keyboardReach',s.reach*s.keyboardPress);
    this.set('breath',idle?.5+.5*Math.sin(now/800):.5);this.set('birdBounce',(s.keyboardBounce+s.mouseBounce)*intensity);
    const phase=(now%4700)/1000;const open=idle&&phase>4.35?Math.min(1,Math.abs(phase-4.525)/.12):1;this.set('eyeLeftOpen',open);this.set('eyeRightOpen',open);
    this.physics?.evaluate(this.model,dt);this.model.update();const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const m=new CubismMatrix44();const aspect=this.canvas.width/this.canvas.height;if(aspect>=1)m.scale(1/aspect,1);else m.scale(1,aspect);m.multiplyByMatrix(this.matrix);
    this.renderer.setMvpMatrix(m);this.renderer.setRenderState(null as unknown as WebGLFramebuffer,[0,0,this.canvas.width,this.canvas.height]);this.renderer.drawModel(shaderUrl);
  }
  dispose(){this.physics?.release();this.renderer?.release();for(const t of this.textures)this.gl.deleteTexture(t);if(this.model)this.moc.deleteModel(this.model);this.moc?.release();}
}
