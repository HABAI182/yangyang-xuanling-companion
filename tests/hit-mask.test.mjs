import test from 'node:test';import assert from 'node:assert/strict';import {alphaRuns} from '../src/hit-mask.mjs';
test('alpha silhouette preserves holes and bottom transparency; row runs remain sorted',()=>{
 const w=12,h=10,a=new Uint8ClampedArray(w*h*4);for(let y=2;y<7;y++)for(let x=2;x<10;x++)if(!(x>=4&&x<8&&y>=3&&y<6))a[(y*w+x)*4+3]=255;
 a[(9*w+11)*4+3]=255;const {runs}=alphaRuns(a,w,h),hit=(x,y)=>runs.some(([r,start,end])=>r===y&&x>=start&&x<end);
 assert.equal(hit(6,4),false);assert.equal(hit(2,2),true);assert.equal(hit(5,9),false);assert.equal(hit(11,9),true);
 for(let i=1;i<runs.length;i++)assert.ok(runs[i][0]>runs[i-1][0]||runs[i][0]===runs[i-1][0]&&runs[i][1]>=runs[i-1][2]);
});
