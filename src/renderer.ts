export type AnimationSnapshot = {keyboardPress:number,mousePress:number,keyboardBounce:number,mouseBounce:number,reach:number,label:string};
export type AnimationOptions={keyboardScale:number,mouseScale:number,headElasticity:number,motionLevel:number,expression:string,motion:string,motionAge:number};
export interface PetRenderer { draw(now:number,s:AnimationSnapshot,gaze:{x:number,y:number},intensity:number,idle:boolean,options?:AnimationOptions):void; dispose():void; }
type Layer = {id:string,file:string,x:number,y:number,width:number,height:number,opacity?:number,image:HTMLImageElement};
export function loadImage(url:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`素材加载失败：${url}`));im.src=url;});}
export class LayerRenderer implements PetRenderer {
  private ctx:CanvasRenderingContext2D;
  private layers:Layer[]=[];
  constructor(private canvas:HTMLCanvasElement){this.ctx=canvas.getContext('2d')!;}
  async load(){const data=await (await fetch('/assets/layers.json')).json();this.canvas.width=data.canvas.width;this.canvas.height=data.canvas.height;
    this.layers=await Promise.all(data.layers.map(async(l:Layer)=>({...l,image:await loadImage(l.file)})));}
  draw(now:number,s:AnimationSnapshot,g:{x:number,y:number},intensity:number,idle:boolean){const ctx=this.ctx;const t=now/1000;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const phase=(now%6100)/1000;const eyeOpen=idle&&phase>5.8?Math.min(1,Math.abs(phase-5.95)/.105):1;
    for(const l of this.layers){let dx=0,dy=0,angle=0,sy=1;let opacity=l.opacity??1;
      const head=l.id==='head-body'||l.id.startsWith('eye-')||l.id.startsWith('lid-');
      if(l.id.startsWith('eye-')){sy=Math.max(.04,eyeOpen);dy=(1-sy)*l.height/2;opacity=Math.min(1,eyeOpen*3);}
      if(l.id.startsWith('lid-')){sy=.7;dy=(1-eyeOpen)*75;opacity=1-eyeOpen;}
      if(l.id==='keyboard-hand'){dx=s.reach*s.keyboardPress*105*intensity;dy=s.keyboardPress*12*intensity-s.keyboardBounce*7*intensity;sy=1-s.keyboardPress*.025*intensity;}
      if(l.id==='mouse-hand'){dx=g.x*12*intensity;dy=g.y*5*intensity+s.mousePress*10*intensity-s.mouseBounce*5*intensity;sy=1-s.mousePress*.025*intensity;}
      if(l.id==='mouse'){dx=g.x*12*intensity;dy=g.y*5*intensity;}
      if(l.id==='bird'){dy=(idle?Math.sin(t*2.5+.8)*4:0)-(s.keyboardBounce+s.mouseBounce)*8*intensity;angle=idle?Math.sin(t*1.5)*.018:0;}
      ctx.save();if(head){const py=this.canvas.height*.48;const px=this.canvas.width*.47;const hy=(idle?Math.sin(t*1.7)*3:0)-(s.keyboardBounce+s.mouseBounce)*10*intensity;ctx.translate(px+g.x*4,py+hy);ctx.rotate(g.x*.008);ctx.translate(-px,-py);}
      ctx.globalAlpha=opacity;ctx.translate(l.x+l.width/2+dx,l.y+l.height/2+dy);ctx.rotate(angle);ctx.scale(1,sy);ctx.drawImage(l.image,-l.width/2,-l.height/2,l.width,l.height);ctx.restore();
    }
  }
  dispose(){this.layers=[];}
}
