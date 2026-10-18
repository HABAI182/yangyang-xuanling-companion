import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Companion} from '../src/companion.mjs';
import {defaults} from '../src/preferences.mjs';

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
