import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {defaults,normalizePreferences,applyTheme} from './preferences.mjs';
import {EDITION,editionPreferences,HAS_COMPANION} from './edition';
const storageKey=`yangyang-${EDITION}-preview-preferences`;
export const desktop=Boolean((window as any).__TAURI_INTERNALS__);
type Widen<T>={-readonly[K in keyof T]:T[K] extends string?string:T[K] extends number?number:T[K] extends boolean?boolean:T[K]};
export type Prefs=Omit<Widen<typeof defaults>,'shortcuts'|'fullscreenExceptions'> & {shortcuts:{enabled:boolean,chord:string,action:string}[],fullscreenExceptions:string[]};
export let prefs:Prefs=normalizePreferences();
export const call=<T=void>(name:string,args?:Record<string,unknown>)=>invoke<T>(name,args);
const callbacks=new Set<(p:Prefs)=>void>();let revision=0,writes=0,tail=Promise.resolve();
export function notify(message:string){const node=document.getElementById('notice');if(node){node.textContent=message;node.classList.add('visible');}}
export function onPreferences(fn:(p:Prefs)=>void){callbacks.add(fn);return()=>callbacks.delete(fn);}
function publish(p:Prefs){prefs=editionPreferences(normalizePreferences(p));applyTheme(prefs);for(const fn of callbacks)fn(prefs);}
export async function initializePreferences(){
 let saved={};if(desktop)saved=await call('read_preferences');else try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}
 publish(normalizePreferences(saved));
 if(desktop)await listen<Prefs>('preferences',e=>{if(writes===0)publish(e.payload);});
 else window.addEventListener('storage',e=>{if(e.key===storageKey&&writes===0)try{publish(JSON.parse(e.newValue||'{}'));}catch{}});
}
export async function updatePreferences(patch:Partial<Prefs>){
 const desired=editionPreferences(normalizePreferences({...prefs,...patch})),mine=++revision;publish(desired);writes++;
 const job=tail.then(async()=>{if(desktop)return await call<Prefs>('save_preferences',{prefs:desired});localStorage.setItem(storageKey,JSON.stringify(desired));return desired;});
 tail=job.then(()=>{},()=>{});
 try{const actual=await job;if(mine===revision)publish(actual);return true;}
 catch(error){if(mine===revision){try{publish(desktop?await call<Prefs>('read_preferences'):normalizePreferences());}catch{}notify(String(error));}return false;}
 finally{writes--;}
}
const channel=desktop?null:new BroadcastChannel(`yangyang-${EDITION}-preview-actions`);
export function onAction(callback:(id:string)=>void){if(desktop)return listen<string>('pet-action',e=>callback(e.payload));if(channel)channel.onmessage=e=>{if(typeof e.data==='string')callback(e.data);};return Promise.resolve(()=>{});}
export async function action(id:string){if(!HAS_COMPANION&&id!=='default')return;if(desktop)await call('pet_action',{action:id});else channel?.postMessage(id);}
export const escapeHtml=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function previewPrefs(){return {...defaults,...prefs};}
