import {Spring} from './key-target.mjs';
export class InputState {
 keyboardHeld=false;mouseHeld=false;keyboardStarted=-Infinity;mouseStarted=-Infinity;
 reach=0;depth=0;zone='rest';label='';labelUntil=0;last=null;speed=1;
 springs={key:new Spring(),mouse:new Spring(),x:new Spring(),y:new Spring(),head:new Spring()};
 advance(now,speed=1){
  if(this.last===null){this.last=now;return;}
  const dt=Math.max(0,(now-this.last)/1000);this.last=now;
  this.springs.key.step(this.keyboardHeld?1:0,dt,25*speed,.45);
  this.springs.mouse.step(this.mouseHeld?1:0,dt,27*speed,.47);
  this.springs.x.step(this.keyboardHeld?this.reach:0,dt,22*speed,.62);
  this.springs.y.step(this.keyboardHeld?this.depth:0,dt,22*speed,.62);
  this.springs.head.step(0,dt,18*speed,.34);
 }
 update(frame,now){
  this.advance(now,this.speed);
  const keyReleased=this.keyboardHeld&&frame.keysHeld===0;
  const mouseReleased=this.mouseHeld&&!frame.mouseDown;
  this.keyboardHeld=frame.keysHeld>0;this.mouseHeld=Boolean(frame.mouseDown);
  if(this.keyboardHeld){this.reach=frame.targetX??frame.reach??0;this.depth=frame.targetY??.35;this.zone=frame.targetZone??'left-near';}else this.zone='rest';
  if(frame.newPress){this.keyboardStarted=now;this.springs.key.kick(8);this.springs.head.kick(27);this.label=frame.keyLabel;this.labelUntil=now+900;}
  if(frame.newMousePress){this.mouseStarted=now;this.springs.mouse.kick(6);this.springs.head.kick(16);}
  // A real release adds a brief upward recoil. Autorepeat never enters here.
  if(keyReleased)this.springs.head.kick(-14);
  if(mouseReleased)this.springs.head.kick(-8);
  this.springs.head.v=Math.max(-34,Math.min(34,this.springs.head.v));
 }
 snapshot(now,speed=1){
  this.speed=speed;this.advance(now,speed);
  return {keyboardPress:this.springs.key.x,mousePress:this.springs.mouse.x,
   keyboardBounce:Math.max(-1.05,Math.min(1.05,this.springs.head.x)),mouseBounce:0,reach:this.springs.x.x,
   depth:this.springs.y.x,zone:this.zone,label:now<this.labelUntil?this.label:''};
 }
}
