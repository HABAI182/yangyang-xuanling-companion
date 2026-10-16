import test from 'node:test';
import assert from 'node:assert/strict';
import {InputState} from '../src/state.mjs';
import {Spring,keyTarget} from '../src/key-target.mjs';
const frame=(x={})=>({keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,reach:0,keyLabel:'',...x});
const near=(a,b,tol=.002)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function settle(s,start,end){for(let t=start;t<=end;t+=1000/60)s.snapshot(t);return s.snapshot(end);}
test('independent springs settle into held poses and return on release',()=>{
 const s=new InputState();s.update(frame({keysHeld:1,newPress:true}),0);let r=settle(s,0,1200);near(r.keyboardPress,1);near(r.mousePress,0);
 s.update(frame({mouseDown:true,newMousePress:true}),1200);r=settle(s,1200,2400);near(r.keyboardPress,0);near(r.mousePress,1);
 s.update(frame(),2400);r=settle(s,2400,3600);near(r.mousePress,0);
});
test('autorepeat does not restart or accumulate energy; repress adds one impulse',()=>{
 const s=new InputState();s.update(frame({keysHeld:1,newPress:true}),0);settle(s,0,1000);
 s.update(frame({keysHeld:1,repeats:['A']}),1000);near(s.snapshot(1100).keyboardBounce,0);assert.equal(s.keyboardStarted,0);
 s.update(frame(),1200);s.update(frame({keysHeld:1,newPress:true}),1250);assert.equal(s.keyboardStarted,1250);assert.ok(s.snapshot(1300).keyboardBounce>.05);
});
test('four physical zones, mirrored screen reach, and distinct Space',()=>{
 assert.deepEqual(['KeyQ','KeyA','KeyU','KeyH','Space'].map(k=>keyTarget(k).zone),['left-far','left-near','right-far','right-near','space']);
 assert.ok(keyTarget('KeyQ').x>keyTarget('KeyU').x);assert.ok(keyTarget('KeyQ').y>keyTarget('KeyA').y);assert.equal(keyTarget('Space').y,0);
});
test('spring overshoots then rests and is invariant to frame subdivision',()=>{
 const a=new Spring(),b=new Spring();a.step(1,.2);for(let i=0;i<12;i++)b.step(1,1/60);near(a.x,b.x,1e-10);assert.ok(a.x>1);
 a.step(1,5);near(a.x,1);near(a.v,0);
});
test('rapid keyboard after mouse release never injects new mouse energy',()=>{
 const s=new InputState();s.update(frame({mouseDown:true,newMousePress:true}),0);s.update(frame(),100);settle(s,100,1200);
 for(let t=1200;t<1700;t+=40){s.update(frame({keysHeld:1,newPress:true}),t);near(s.snapshot(t+10).mousePress,0);s.update(frame(),t+20);}
 assert.equal(s.mouseStarted,0);near(settle(s,1700,3000).keyboardPress,0);
});

test('press has a visible impulse, real release recoils, repeated held frames add no energy',()=>{
 const s=new InputState();s.update(frame({keysHeld:1,newPress:true}),0);
 assert.ok(s.snapshot(65).keyboardBounce>.8);
 settle(s,65,1600);
 for(let t=1600;t<1900;t+=20)s.update(frame({keysHeld:1}),t);
 near(s.snapshot(1900).keyboardBounce,0);
 s.update(frame(),1900);assert.ok(s.snapshot(1965).keyboardBounce<-.4);
 const rapid=new InputState();let peak=0;
 for(let t=0;t<2000;t+=20){rapid.update(frame({keysHeld:t%40===0?1:0,newPress:t%40===0}),t);peak=Math.max(peak,Math.abs(rapid.snapshot(t+10).keyboardBounce));}
 assert.ok(peak<=1.05);near(settle(rapid,2010,4000).keyboardBounce,0);
});
