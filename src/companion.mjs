import {actionIds} from './preferences.mjs';
export const lines=[
 '风把今天的问候带来了','我在这里陪着你','慢一点也没有关系','听，风正经过窗边','今天也一起加油吧','你专心，我会安静陪伴',
 '已经做得很好了','休息一下眼睛吧','要记得喝一点水','小鸟也在为你打气','今天有什么开心的事吗','让我替你收好这一缕风',
 '不必急着追赶每一步','一件一件来就好','听见键盘的声音了','这次一定会很顺利','你的努力，我看见了','风会带走一点疲惫',
 '偶尔发呆也很好','我会守在桌面一角','要不要伸个懒腰','把肩膀放松一点','新的灵感也许快到了','有你在，今天很温暖',
 '我们已经走了很远','把烦恼交给晚风吧','小小的进步也值得开心','我也喜欢这样安静的时光','窗外的风很轻','今天辛苦啦',
 '再试一次，我陪你','别忘了给自己一点奖励','正在认真听你说话','一起迎接下一阵风','愿今天有温柔的相遇','就这样，慢慢往前走',
];
export class Companion {
 expression='default';actionStarted=0;motion='';until=0;lastInput=0;lastBubble=-Infinity;bubble='';bubbleUntil=0;index=0;lastTouch=-Infinity;autoSleeping=false;
 activity(now){this.lastInput=now;if(this.autoSleeping){this.expression='default';this.autoSleeping=false;}}
 say(now,p,text){if(!p.bubblesEnabled)return;this.bubble=text??lines[this.index++%lines.length];this.bubbleUntil=now+p.bubbleSeconds*1000;this.lastBubble=now;}
 action(id,now,p){
  if(!actionIds.has(id))return false;
  this.activity(now);this.motion=['nod','bird','cheer'].includes(id)?id:'';
  this.expression=this.motion?this.motion==='cheer'?'smile':'default':id;
  this.actionStarted=now;this.until=this.motion?now+2400:0;
  const text=({nod:'嗯，我在听',bird:'小鸟也想和你一起玩',cheer:'让风为你捎去一点勇气',sleepy:'稍微休息一会儿',wind:'我听见风的声音了',blush:'被你发现啦',angry:'呼……先深呼吸一下'})[id];
  if(id!=='default')this.say(now,p,text);return true;
 }
 touch(now,p){if(!p.touchEnabled||now-this.lastTouch<2500)return;this.lastTouch=now;this.action('blush',now,p);}
 read(now,p){
  if(this.until&&now>this.until){this.motion='';this.expression='default';this.until=0;}
  if(p.sleepMinutes&&now-this.lastInput>=p.sleepMinutes*60000&&this.expression==='default'){this.expression='sleepy';this.autoSleeping=true;}
  if(!p.sleepMinutes&&this.autoSleeping){this.expression='default';this.autoSleeping=false;}
  if(p.idleSeconds&&now-this.lastInput>p.idleSeconds*1000&&now-this.lastBubble>p.idleSeconds*1000)this.say(now,p);
  return {expression:this.expression,motion:this.motion,age:now-this.actionStarted,bubble:p.bubblesEnabled&&now<this.bubbleUntil?this.bubble:''};
 }
}
