import {alphaRuns} from './hit-mask.mjs';
import {call,desktop} from './bridge';

export class HitTesting {
 private canvas=document.createElement('canvas');
 private ctx=this.canvas.getContext('2d',{willReadFrequently:true})!;
 private last=0;private hash='';private pending=false;private sent=0;private error='';
 constructor(private shell:HTMLElement){}
 sample(now:number){
  if(this.pending||now-this.last<65)return;this.last=now;
  const bounds=this.shell.getBoundingClientRect(),width=Math.min(480,Math.ceil(bounds.width)),height=Math.ceil(width*bounds.height/bounds.width);
  if(!width||!height)return;
  if(this.canvas.width!==width)this.canvas.width=width;if(this.canvas.height!==height)this.canvas.height=height;const ctx=this.ctx,sx=width/bounds.width,sy=height/bounds.height;
  ctx.clearRect(0,0,width,height);
  for(const canvas of this.shell.querySelectorAll<HTMLCanvasElement>('canvas')){
   const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height);
   // Match the canvases' object-fit:contain; object-position:center bottom.
   const w=canvas.width*scale,h=canvas.height*scale;
   ctx.drawImage(canvas,(r.left-bounds.left+(r.width-w)/2)*sx,(r.bottom-bounds.top-h)*sy,w*sx,h*sy);
  }
  // Bottom toolbar buttons stay interactive; the empty space between them
  // and all the remaining bottom gutter pass through to the desktop.
  ctx.fillStyle='#fff';
  for(const el of this.shell.querySelectorAll<HTMLElement>('.pet-tools button,#notice.visible')){
   const r=el.getBoundingClientRect();ctx.fillRect((r.left-bounds.left)*sx,(r.top-bounds.top)*sy,r.width*sx,r.height*sy);
  }
  const {runs,hash}=alphaRuns(ctx.getImageData(0,0,width,height).data,width,height),key=`${width},${height},${hash}`;
  if(this.hash===key)return;this.hash=key;
  if(desktop){this.pending=true;void call('update_hit_mask',{width,height,runs}).then(()=>{this.sent++;this.error='';}).catch(e=>{this.hash='';this.error=String(e);}).finally(()=>{this.pending=false;});}
 }
 read(){return {width:this.canvas.width,height:this.canvas.height,updates:this.sent,error:this.error};}
}
