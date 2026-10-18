export const EDITION = import.meta.env.VITE_APP_EDITION === 'basic' ? 'basic' : 'full';
export const HAS_COMPANION = EDITION === 'full';
export const EDITION_LABEL = HAS_COMPANION ? '表情完整版' : '免费基础版';
export const APP_VERSION = '0.3.6';

/** Edition is baked into the build, never restored from user preferences. */
export function editionPreferences<T extends Record<string, any>>(p:T):T {
 if(HAS_COMPANION)return p;
 return {...p,bubblesEnabled:false,touchEnabled:false,idleSeconds:0,sleepMinutes:0,
  shortcuts:Array.isArray(p.shortcuts)?p.shortcuts.map((s:any)=>({...s,enabled:false})):[]};
}
