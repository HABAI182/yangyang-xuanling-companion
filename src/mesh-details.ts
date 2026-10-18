import type {CubismModel} from '../vendor/live2d/src/model/cubismmodel';
import {loadImage} from './renderer';

type Point={x:number,y:number};
type Bind={indices:number[],weights:number[]};
type Patch={image:HTMLImageElement,box:number[],show:string,moods?:string[],excludeMoods?:string[],points:Point[],binds:Bind[],triangles:number[][]};
export const VIEW_WIDTH=1584,VIEW_HEIGHT=1360,VIEW_PADDING=24;

/** Supplementary art is attached to actual native head vertices, including
 * any Core geometry and subsequent spring transform. Topology is cached once.
 * This deliberately does not claim to author new geometry in the CMO3. */
export class MeshDetails{
 private index=-1;private rest:Point[]=[];private indices:Uint16Array=new Uint16Array();
 private cache=new Map<string,Bind>();private patches:Patch[]=[];
 private canvas:HTMLCanvasElement;private ctx:CanvasRenderingContext2D;
 constructor(private model:CubismModel,canvas:HTMLCanvasElement){
  this.canvas=document.createElement('canvas');this.canvas.className='mesh-details';this.canvas.width=VIEW_WIDTH;this.canvas.height=VIEW_HEIGHT;this.canvas.setAttribute('aria-hidden','true');canvas.after(this.canvas);this.ctx=this.canvas.getContext('2d')!;
  for(let i=0;i<model.getDrawableCount();i++)if(model.getDrawableId(i).getString()==='ArtMesh8')this.index=i;
  if(this.index<0)throw new Error('缺少发梢与面部补片所需的原生头部网格');
  const v=model.getDrawableVertexPositions(this.index),cw=model.getCanvasWidth(),ch=model.getCanvasHeight();
  for(let i=0;i<v.length;i+=2)this.rest.push({x:(v[i]/cw+.5)*1536,y:(.5-v[i+1]/ch)*1360});
  this.indices=model.getDrawableVertexIndices(this.index);
 }
 async load(){
  const data=await(await fetch('/assets/detail-v14/patches.json')).json();
  for(const p of data.patches){
   const [x,y,x1,y1]=p.box,cols=p.show?.endsWith('Closed')?8:3,rows=p.always?10:p.show?.endsWith('Closed')?8:4,points:Point[]=[],binds:Bind[]=[],triangles:number[][]=[];
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const q={x:x+(x1-x)*i/cols,y:y+(y1-y)*j/rows};points.push(q);binds.push(this.bind(q.x,q.y));}
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;triangles.push([a,b,c],[b,d,c]);}
   this.patches.push({image:await loadImage(p.file),box:p.box,show:p.show??(p.always?'always':'mouth'),moods:p.moods,excludeMoods:p.excludeMoods,points,binds,triangles});
  }
 }
 private bind(x:number,y:number){
  const key=`${x},${y}`,old=this.cache.get(key);if(old)return old;
  let best:Bind|undefined,score=Infinity;
  for(let i=0;i<this.indices.length;i+=3){
   const ids=Array.from(this.indices.slice(i,i+3)),[a,b,c]=ids.map(j=>this.rest[j]);
   const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-7)continue;
   const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w=1-u-v;
   // Inside triangles win. For the 16px hair extension, continue the nearest
   // boundary triangle a short way; never re-search topology during animation.
   const penalty=[u,v,w].reduce((s,n)=>s+Math.max(0,-n),0),distance=((a.x+b.x+c.x)/3-x)**2+((a.y+b.y+c.y)/3-y)**2;
   const candidate=penalty*1e9+distance;
   if(candidate<score){score=candidate;best={indices:ids,weights:[u,v,w]};if(penalty<1e-7)break;}
  }
  if(!best)throw new Error('原生面部网格没有可用三角形');this.cache.set(key,best);return best;
 }
 private project(b:Bind):Point{
  const v=this.model.getDrawableVertexPositions(this.index),cw=this.model.getCanvasWidth(),ch=this.model.getCanvasHeight();let x=0,y=0;
  for(let j=0;j<3;j++){x+=v[b.indices[j]*2]*b.weights[j];y+=v[b.indices[j]*2+1]*b.weights[j];}
  return {x:(x/cw+.5)*1536,y:(.5-y/ch)*1360};
 }
 transform(x:number,y:number){
  const p=this.project(this.bind(x,y)),qx=this.project(this.bind(x+1,y)),qy=this.project(this.bind(x,y+1));
  const a=qx.x-p.x,b=qx.y-p.y,c=qy.x-p.x,d=qy.y-p.y;
  return `matrix(${a} ${b} ${c} ${d} ${p.x-a*x-c*y} ${p.y-b*x-d*y})`;
 }
 draw(expression:string,eyes:{leftOpen:number,rightOpen:number}){
  const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,VIEW_WIDTH,VIEW_HEIGHT);ctx.translate(VIEW_PADDING,0);
  for(const p of this.patches){
   if(p.moods&&!p.moods.includes(expression)||p.excludeMoods?.includes(expression))continue;
   if(p.show==='mouth'&&expression==='default'||p.show==='leftClosed'&&eyes.leftOpen!==0||p.show==='rightClosed'&&eyes.rightOpen!==0)continue;
   const projected=p.binds.map(b=>this.project(b));
   for(const t of p.triangles){
    const [a,b,c]=t.map(i=>p.points[i]),[A,B,C]=t.map(i=>projected[i]);
    const den=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(den)<1e-9)continue;
    const xx=((B.x-A.x)*(c.y-a.y)-(C.x-A.x)*(b.y-a.y))/den,xy=((C.x-A.x)*(b.x-a.x)-(B.x-A.x)*(c.x-a.x))/den;
    const yx=((B.y-A.y)*(c.y-a.y)-(C.y-A.y)*(b.y-a.y))/den,yy=((C.y-A.y)*(b.x-a.x)-(B.y-A.y)*(c.x-a.x))/den;
    // Slightly overlap raster triangle clips so Canvas antialiasing cannot
    // leave a dark wireframe between adjacent, otherwise opaque cells.
    const center={x:(A.x+B.x+C.x)/3,y:(A.y+B.y+C.y)/3};
    const expanded=[A,B,C].map(q=>{const dx=q.x-center.x,dy=q.y-center.y,n=Math.hypot(dx,dy)||1;return {x:q.x+dx/n*.85,y:q.y+dy/n*.85};});
    ctx.save();ctx.beginPath();ctx.moveTo(expanded[0].x,expanded[0].y);ctx.lineTo(expanded[1].x,expanded[1].y);ctx.lineTo(expanded[2].x,expanded[2].y);ctx.closePath();ctx.clip();
    ctx.transform(xx,yx,xy,yy,A.x-xx*a.x-xy*a.y,A.y-yx*a.x-yy*a.y);ctx.drawImage(p.image,p.box[0],p.box[1],p.box[2]-p.box[0],p.box[3]-p.box[1]);ctx.restore();
   }
  }
 }
 dispose(){this.canvas.remove();}
}
