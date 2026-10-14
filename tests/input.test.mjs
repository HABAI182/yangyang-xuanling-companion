import test from 'node:test';
import assert from 'node:assert/strict';
import {InputState} from '../src/state.mjs';
const frame=(overrides={})=>({keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,reach:0,keyLabel:'',...overrides});
test('keyboard and mouse drive independent hands',()=>{
  const s=new InputState();s.update(frame({keysHeld:1,newPress:true}),100);
  assert.equal(s.snapshot(150).keyboardPress,1);assert.equal(s.snapshot(150).mousePress,0);
  s.update(frame({mouseDown:true,newMousePress:true}),200);
  assert.equal(s.snapshot(400).keyboardPress,0);assert.equal(s.snapshot(400).mousePress,1);
});
test('held-key repeats maintain press without restarting bounce; a real re-press restarts',()=>{
  const s=new InputState();s.update(frame({keysHeld:1,newPress:true}),100);
  s.update(frame({keysHeld:1}),900);assert.equal(s.keyboardStarted,100);assert.equal(s.snapshot(900).keyboardBounce,0);
  s.update(frame(),950);s.update(frame({keysHeld:1,newPress:true}),1000);assert.equal(s.keyboardStarted,1000);
  assert.notEqual(s.snapshot(1050).keyboardBounce,0);
});
test('one key releasing while another stays held keeps the hand down',()=>{
  const s=new InputState();s.update(frame({keysHeld:2,newPress:true}),100);s.update(frame({keysHeld:1}),200);
  assert.equal(s.snapshot(300).keyboardPress,1);s.update(frame(),400);assert.equal(s.snapshot(550).keyboardPress,0);
});
