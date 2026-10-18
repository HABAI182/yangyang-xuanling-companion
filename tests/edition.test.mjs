import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Companion} from '../src/companion.mjs';
import {defaults} from '../src/preferences.mjs';
import {restrictEditionPreferences} from '../src/edition-policy.mjs';

test('basic edition rejects direct and touch actions and ignores premium preferences',()=>{
 const c=new Companion(false),p={...defaults,sleepMinutes:5,idleSeconds:60,bubblesEnabled:true,touchEnabled:true};
 for(const id of ['smile','sleepy','blush','bird','cheer','nod'])assert.equal(c.action(id,100,p),false);
 c.touch(4000,p);c.say(8000,p,'should not appear');
 assert.deepEqual(c.read(999999,p),{expression:'default',motion:'',age:0,bubble:''});
 assert.equal(c.action('default',999999,p),true);
});
test('full edition retains expressions, speech and custom bird motion',()=>{
 const c=new Companion(true);assert.equal(c.action('sleepy',100,defaults),true);
 assert.equal(c.read(200,defaults).expression,'sleepy');assert.ok(c.read(200,defaults).bubble);
 assert.equal(c.action('bird',300,defaults),true);assert.equal(c.read(400,defaults).motion,'bird');
});

test('static restored preferences cannot re-enable animation while desktop preferences survive',()=>{
 const incoming={...defaults,size:630,alwaysOnTop:false,clickThrough:true,theme:'dark',autostart:true,
  hoverFade:true,gamepadEnabled:true,sfxEnabled:true,shortcuts:[{enabled:true,chord:'Ctrl+Alt+1',action:'bird'}]};
 const p=restrictEditionPreferences(incoming,'static');
 for(const key of ['inputEnabled','showKeys','idleEnabled','cursorFollow','gazeReturnEnabled','touchEnabled','bubblesEnabled','hoverFade','gamepadEnabled','sfxEnabled'])assert.equal(p[key],false,key);
 assert.equal(p.motion,'off');assert.equal(p.intensity,0);assert.equal(p.mouseScale,0);assert.equal(p.keyboardScale,0);
 assert.equal(p.sleepMinutes,0);assert.equal(p.idleSeconds,0);assert(p.shortcuts.every(x=>!x.enabled));
 assert.equal(p.size,630);assert.equal(p.alwaysOnTop,false);assert.equal(p.clickThrough,true);assert.equal(p.theme,'dark');assert.equal(p.autostart,true);
 assert.equal(incoming.shortcuts[0].enabled,true);assert.equal(incoming.cursorFollow,true);
});

test('basic keeps keyboard and gaze capabilities and full retains all preferences',()=>{
 const p={...defaults,shortcuts:[{enabled:true,chord:'Ctrl+Alt+1',action:'smile'}]};
 const basic=restrictEditionPreferences(p,'basic');
 assert.equal(basic.inputEnabled,true);assert.equal(basic.cursorFollow,true);assert.equal(basic.idleEnabled,true);assert.equal(basic.bubblesEnabled,false);
 assert.equal(restrictEditionPreferences(p,'full'),p);
});
