import test from 'node:test';import assert from 'node:assert/strict';
import {GazeController} from '../src/gaze-controller.mjs';import {defaults} from '../src/preferences.mjs';
test('stationary pointer softly returns after configured delay; motion resumes immediately',()=>{
 const g=new GazeController();g.update(.8,-.6,100);
 assert.equal(g.read(3000,defaults).mode,'following');
 const halfway=g.read(3525,defaults);assert.equal(halfway.mode,'returning');assert.ok(halfway.x>0&&halfway.x<.8);
 assert.deepEqual(g.read(4000,defaults),{x:0,y:-0,mode:'centered',weight:0});
 g.update(.81,-.6,4100);assert.equal(g.read(4101,defaults).x,.81);
});
test('repeated native frames or keyboard events do not postpone gaze return; click and movement do',()=>{
 const g=new GazeController();g.update(1,.5,0);for(let now=100;now<4000;now+=100)g.update(1,.5,now);
 assert.equal(g.read(4000,defaults).mode,'centered');g.update(1,.5,4100,true);assert.equal(g.read(4101,defaults).mode,'following');
 assert.equal(g.read(20000,{...defaults,gazeReturnEnabled:false}).x,1);assert.equal(g.read(20000,{...defaults,cursorFollow:false}).mode,'disabled');
 const short={...defaults,gazeIdleSeconds:1};assert.equal(g.read(6000,short).mode,'centered');
});

test('movement outside the pet resets the timer even if normalized coordinates stay clamped',()=>{
 const g=new GazeController();g.update(-1,-1,0);assert.equal(g.read(5000,defaults).mode,'centered');
 g.update(-1,-1,5100,true);assert.equal(g.read(5200,defaults).mode,'following');
});
