import {restrictEditionPreferences} from './edition-policy.mjs';
export const IS_STATIC = import.meta.env.VITE_APP_EDITION === 'static';
export const EDITION = IS_STATIC ? 'static' : import.meta.env.VITE_APP_EDITION === 'basic' ? 'basic' : 'full';
export const HAS_COMPANION = EDITION === 'full';
export const EDITION_LABEL = IS_STATIC ? '静态桌面版' : HAS_COMPANION ? '表情完整版' : '无表情互动版';
export const APP_VERSION = '0.3.7';

/** Edition is baked into the build, never restored from user preferences. */
export function editionPreferences<T extends Record<string, any>>(p:T):T {
 return restrictEditionPreferences(p,EDITION);
}
