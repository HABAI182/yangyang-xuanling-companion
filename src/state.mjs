import {Spring} from './key-target.mjs';
export class InputState {
 keyboardHeld=false;mouseHeld=false;keyboardStarted=-Infinity;mouseStarted=-Infinity;
 reach=0;depth=0;zone='rest';label='';labelUntil=0;last=null;speed=1;
 springs={key:new Spring(),mouse:new Spring(),x:new Spring(),y:new Spring(),head:new Spring()};
 advance(now,speed=1){
  if(this.last===null){this.last=now;return;}
  const dt=Math.max(0,(now-this.last)/1000);this.last=now;
  this.springs.key.step(this.keyboardHeld?1:0,dt,28*speed,.54);
  this.springs.mouse.step(this.mouseHeld?1:0,dt,30*speed,.55);
  this.springs.x.step(this.keyboardHeld?this.reach:0,dt,22*speed,.62);
  this.springs.y.step(this.keyboardHeld?this.depth:0,dt,22*speed,.62);
  this.springs.head.step(0,dt,19*speed,.4);
 }
 update(frame,now){
  this.advance(now,this.speed);
  this.keyboardHeld=frame.keysHeld>0;this.mouseHeld=Boolean(frame.mouseDown);
  if(this.keyboardHeld){this.reach=frame.targetX??frame.reach??0;this.depth=frame.targetY??.35;this.zone=frame.targetZone??'left-near';}else this.zone='rest';
  if(frame.newPress){this.keyboardStarted=now;this.springs.key.kick(7);this.springs.head.kick(16);this.label=frame.keyLabel;this.labelUntil=now+900;}
  if(frame.newMousePress){this.mouseStarted=now;this.springs.mouse.kick(5);this.springs.head.kick(9);}
 }
 snapshot(now,speed=1){
  this.speed=speed;this.advance(now,speed);
  return {keyboardPress:this.springs.key.x,mousePress:this.springs.mouse.x,
   keyboardBounce:Math.max(-.8,Math.min(.8,this.springs.head.x)),mouseBounce:0,reach:this.springs.x.x,
   depth:this.springs.y.x,zone:this.zone,label:now<this.labelUntil?this.label:''};
 }
}
