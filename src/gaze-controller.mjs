const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
export class GazeController{
 constructor(){this.x=0;this.y=0;this.anchorX=0;this.anchorY=0;this.lastMovement=0;this.seen=false;}
 update(x,y,now,clicked=false){
  x=clamp(Number.isFinite(x)?x:0,-1,1);y=clamp(Number.isFinite(y)?y:0,-1,1);
  if(!this.seen||Math.hypot(x-this.anchorX,y-this.anchorY)>.002||clicked){this.lastMovement=now;this.anchorX=x;this.anchorY=y;this.seen=true;}
  this.x=x;this.y=y;
 }
 read(now,p){
  if(!p.cursorFollow)return {x:0,y:0,mode:'disabled',weight:0};
  const age=Math.max(0,now-this.lastMovement),delay=clamp(p.gazeIdleSeconds??3,1,15)*1000;
  const t=p.gazeReturnEnabled?clamp((age-delay)/850,0,1):0;
  const weight=1-t*t*(3-2*t);
  return {x:this.x*weight,y:this.y*weight,mode:t>=1?'centered':t>0?'returning':'following',weight};
 }
}
