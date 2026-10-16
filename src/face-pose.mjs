// Menu expressions use facial changes first. Decorations remain secondary.
// Eye openness uses the existing native open/closed art, never a crossfade.
export function expressionPose(id,now=0,age=0,idle=false){
 const blink=idle&&now%5700>5460&&now%5700<5590;
 const p={leftOpen:blink?0:1,rightOpen:blink?0:1,irisX:1,irisY:1,gazeY:0};
 switch(id){
  case 'smile':p.irisY=.96;break;
  case 'think':p.gazeY=-.14;p.irisY=.96;break;
  case 'surprised':p.irisX=.86;p.irisY=.9;break;
  case 'resigned':p.irisY=.91;break;
  case 'blush':p.gazeY=.16;p.irisY=.97;break;
  case 'sleepy':p.leftOpen=p.rightOpen=0;break;
  case 'serious':p.irisX=.98;p.irisY=.9;break;
  case 'laugh':p.leftOpen=p.rightOpen=0;break;
  case 'angry':p.irisX=.95;p.irisY=.88;break;
  case 'pout':p.irisX=1.025;p.irisY=.97;break;
  case 'shy':p.leftOpen=0;p.gazeY=.2;p.irisY=.96;break;
  case 'wronged':p.irisX=1.025;p.irisY=1.02;p.gazeY=.12;break;
  case 'proud':p.rightOpen=0;p.irisY=.96;break;
  case 'confused':p.irisX=.96;p.gazeY=-.1;break;
  case 'starry':p.irisX=1.035;p.irisY=1.025;break;
  case 'wind':p.irisY=.97;break;
 }
 return p;
}

// A local, shared field shapes the actual lid/lash pixels on the head and the
// sclera mask together. It never scales a coarse eye rectangle containing hair.
// Zero outside a small eye neighbourhood; default is an exact identity.
export function expressionEyeWarp(x,y,id){
 const config={smile:[6,0,2],think:[5,-4,0],surprised:[-3,0,-1],resigned:[17,0,0],blush:[6,0,1],serious:[18,7,0],angry:[24,11,1],pout:[8,0,4],shy:[6,0,1],wronged:[-1,-7,3],proud:[12,0,0],confused:[7,-8,0],starry:[-4,0,-2],wind:[9,0,1]}[id];
 if(!config)return 0;
 let dy=0;
 for(const [cx,top,bottom,sign] of [[592,751,858,1],[930,831,941,-1]]){
  const horizontal=Math.exp(-(((x-cx)/87)**4));
  const upper=Math.exp(-(((y-top)/34)**2)),lower=Math.exp(-(((y-bottom)/23)**2));
  let depth=config[0]+config[1]*sign*(x-cx)/67;
  if(id==='confused'||id==='think')depth+=sign*config[1];
  dy+=horizontal*(depth*upper-config[2]*lower);
 }
 return dy;
}
