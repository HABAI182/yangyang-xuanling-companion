import type {CubismModel} from '../vendor/live2d/src/model/cubismmodel';
import type {AnimationSnapshot,AnimationOptions} from './renderer';
import {expressionPose,expressionEyeWarp} from './face-pose.mjs';
export function deform(model:CubismModel,restored:Map<number,Float32Array>,now:number,s:AnimationSnapshot,g:{x:number,y:number},intensity:number,idle:boolean,o:AnimationOptions){
 const cw=model.getCanvasWidth(),ch=model.getCanvasHeight(),level=o.motionLevel;
 const toX=(px:number)=>(px/1536-.5)*cw,toY=(py:number)=>(.5-py/1360)*ch;
 // Bound the whole-body deformation even at maximum user intensity. Positive
 // input compresses downward; its negative rebound stretches upward.
 const pulse=Math.max(-.46,Math.min(.92,s.keyboardBounce*intensity*o.headElasticity))*level;
 const stretch=-pulse*.085;
 const nod=o.motion==='nod'?Math.sin(o.motionAge/170)*Math.exp(-o.motionAge/1100):0;
 const cheer=o.motion==='cheer'?Math.max(0,Math.sin(o.motionAge/140))*Math.exp(-o.motionAge/1500):0;
 const angle=g.x*.008*o.headElasticity*level+pulse*.025+nod*.035*o.headElasticity*level;
 const dy=((idle?Math.sin(now/850)*.0014:0)+cheer*.015+nod*.008)*ch*level-pulse*.025*ch;
 const pivotX=toX(760),pivotY=toY(1060),cos=Math.cos(angle),sin=Math.sin(angle);
 const keyX=Math.max(-145,Math.min(115,s.reach*160*o.keyboardScale*intensity)),keyY=Math.max(-8,Math.min(69,(s.depth*44+s.keyboardPress*21)*o.keyboardScale*intensity));
 // Travel is in the original 1536x1360 artwork space. Keep the pointer
 // bounded, and move mouse/palm together while the sleeve root eases out.
 const mouseX=Math.max(-1,Math.min(1,o.pointer?.x??g.x))*52*o.mouseScale;
 const mouseY=Math.max(-1,Math.min(1,o.pointer?.y??g.y))*24*o.mouseScale;
 const face=['ArtMesh8','ArtMesh2','ArtMesh3','ArtMesh4','ArtMesh5','ArtMesh6','ArtMesh7','ArtMesh1'];
 const pose=expressionPose(o.expression,now,o.motionAge,idle),gazeScale=o.gazeScale??2.1;
 for(let i=0;i<model.getDrawableCount();i++){
  const id=model.getDrawableId(i).getString(),head=face.includes(id),bird=id==='bird',mouse=id==='mouse'||id==='ArtMesh0',key=id==='ArtMesh';
  if(!head&&!bird&&!mouse&&!key)continue;
  const vertices=model.getDrawableVertexPositions(i);restored.set(i,new Float32Array(vertices));
  for(let k=0;k<vertices.length;k+=2){let x=vertices[k],y=vertices[k+1];const ox=x,oy=y;
   if(head){
    const sourceY=(.5-oy/ch)*1360;
    // Bend sleeve roots toward their own palm, leaving the face/hair untouched.
    if(id==='ArtMesh1'||id==='ArtMesh8'){
     const sx=(ox/cw+.5)*1536,sy=(.5-oy/ch)*1360;
     const right=Math.max(0,Math.min(1.25,(1170-sx)/165));
     const left=Math.exp(-(((sx-360)/115)**2)-(((sy-1040)/65)**2));
     // v10 contains only the actual cuff in this disconnected right component;
     // face/hair are on the fixed head layer, including the upper cuff seam.
     const cloth=id==='ArtMesh1'&&sx>750?1:0;
     x+=keyX/1536*cw*right*cloth+mouseX/1536*cw*left;
     y-=(keyY+s.keyboardPress*15)/1360*ch*right*cloth+mouseY/1360*ch*left;
    }
    // Original-pixel pupils share a bounded, smoothly damped gaze.
    if(id==='ArtMesh4'||id==='ArtMesh5'){
     const closed=(id==='ArtMesh5'?pose.leftOpen:pose.rightOpen)===0;
     const cx=toX(id==='ArtMesh5'?610:920),cy=toY(id==='ArtMesh5'?810:890);
     x=cx+(x-cx)*(closed?.02:pose.irisX);
     y=cy+(y-cy)*(closed?.02:pose.irisY)-(g.y*gazeScale+pose.gazeY)*ch*(closed?0:.0036);
     x+=closed?0:g.x*gazeScale*9.5/1536*cw;
    }
    const eyeDy=expressionEyeWarp((x/cw+.5)*1536,(.5-y/ch)*1360,o.expression);
    y-=eyeDy/1360*ch;
    const dx=x-pivotX,hy=y-pivotY;
    // The face bounces strongly while the cuff attachment eases to zero at
    // the desk. This avoids tearing wrists away from stationary palms.
    const attachment=Math.max(0,Math.min(1,(1130-sourceY)/190));
    x+=(pivotX+dx*(1-stretch*.42)*cos-hy*(1+stretch)*sin-x)*attachment;
    y+=(pivotY+dx*(1-stretch*.42)*sin+hy*(1+stretch)*cos+dy-y)*attachment;
   }
   if(mouse){x+=mouseX/1536*cw;y-=mouseY/1360*ch;
    if(id==='ArtMesh0'){const cy=toY(1085);y=cy+(y-cy)*(1-s.mousePress*.06)-s.mousePress*ch*.008;}}
   if(key){const cx=toX(940),cy=toY(1120);x=cx+(x-cx)*(1+s.keyboardPress*.045)+keyX/1536*cw;y=cy+(y-cy)*(1-s.keyboardPress*.085)-keyY/1360*ch;}
   if(bird){
    const playful=o.motion==='bird'?Math.sin(o.motionAge/100)*Math.exp(-o.motionAge/1800):0;
    const hop=idle?Math.max(0,Math.sin(now/135))**4*Math.max(0,Math.sin(now/2300))*.009:0;
    const tilt=((idle?Math.sin(now/480)*.028:0)+playful*.075)*level+pulse*.12;
    const bx=toX(1370),by=toY(1130),dx=x-bx,hy=y-by;
    const tail=Math.max(0,Math.min(1,((ox/cw+.5)*1536-1400)/130));
    x=bx+dx*Math.cos(tilt)-hy*Math.sin(tilt);y=by+dx*Math.sin(tilt)+hy*Math.cos(tilt);
    y+=(hop+playful*.018+(idle?Math.sin(now/210)*.0035:0)+tail*Math.sin(now/110)*.006)*ch*level-pulse*.022*ch;
   }
   vertices[k]=x;vertices[k+1]=y;
  }
 }
 return {angle,stretch,sourceDy:-dy/ch*1360};
}
