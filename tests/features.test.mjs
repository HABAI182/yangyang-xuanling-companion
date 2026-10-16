import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,normalizePreferences,expressions} from '../src/preferences.mjs';
import {KeyOverlay} from '../src/key-overlay.mjs';import {Companion,lines} from '../src/companion.mjs';
import {expressionPose} from '../src/face-pose.mjs';
test('new overlay and gaze preferences migrate independently and clamp invalid values',()=>{
 const old=normalizePreferences({size:445.2,showKeys:false});
 assert.equal(old.size,445.2);assert.equal(old.showKeys,false);assert.equal(old.keyBubbleScale,1.3);assert.equal(old.speechBubbleScale,1);assert.equal(old.gazeScale,1.65);
 const bounded=normalizePreferences({keyBubbleScale:9,speechBubbleScale:NaN,gazeScale:-1});
 assert.equal(bounded.keyBubbleScale,1.8);assert.equal(bounded.speechBubbleScale,1);assert.equal(bounded.gazeScale,.5);
});
test('menu eye poses distinguish laughter, shyness, pride and surprise; default stays neutral',()=>{
 assert.deepEqual(expressionPose('default'),{leftOpen:1,rightOpen:1,irisX:1,irisY:1,gazeY:0});
 const laugh=expressionPose('laugh'),shy=expressionPose('shy'),proud=expressionPose('proud');
 assert.equal(laugh.leftOpen+laugh.rightOpen,0);assert.equal(shy.leftOpen,0);assert.equal(shy.rightOpen,1);assert.equal(proud.rightOpen,0);assert.equal(proud.leftOpen,1);
 assert.ok(expressionPose('surprised').irisX<1);assert.equal(expressionPose('default',5500,0,true).leftOpen,0);
});
test('old preferences retain explicit choices and gain bounded new defaults',()=>{
 const p=normalizePreferences({showKeys:false,alwaysOnTop:false,size:420,maxKeys:99,theme:'invalid'});
 assert.equal(p.showKeys,false);assert.equal(p.alwaysOnTop,false);assert.equal(p.maxKeys,6);assert.equal(p.theme,'system');assert.equal(p.repeatKeys,false);
});
test('multi-key badges are bounded, expire individually, and repeats stay separate from input motion',()=>{
 const k=new KeyOverlay(),p={...defaults,multiKeys:true,maxKeys:2};k.add(['A'],0,p);k.add(['B','C'],500,p);
 assert.deepEqual(k.read(600,p).map(x=>x.label),['B','C']);k.add(['C'],700,p,true);assert.equal(k.sequence,3);
 assert.equal(k.read(2001,p).length,0);k.add(['secret text'],2100,p);assert.equal(k.badges.length,0);
});
test('sleep wakes on input, forced sleep remains until a new action, and all catalog actions have output',()=>{
 const c=new Companion(),p={...defaults,sleepMinutes:5,idleSeconds:0};assert.equal(lines.length,36);assert.equal(expressions.length,17);
 assert.equal(c.read(300001,p).expression,'sleepy');c.activity(300002);assert.equal(c.read(300003,p).expression,'default');
 for(const [id] of expressions){assert.equal(c.action(id,400000,p),true);assert.equal(c.read(400001,p).expression,id);}
 assert.equal(c.action('unknown',500000,p),false);
});
