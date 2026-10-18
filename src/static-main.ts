import './style.css';
import {desktop,initializePreferences,call,notify} from './bridge';
import {settingsPage,menuPage} from './settings';
import {staticPetPage} from './static-pet';

(async()=>{
 await initializePreferences();const app=document.querySelector<HTMLDivElement>('#app')!,query=new URLSearchParams(location.search);
 if(query.has('settings'))await settingsPage(app);else if(query.has('menu'))menuPage(app);else await staticPetPage(app);
})().catch(async error=>{notify(String(error));if(desktop)await call('pet_ready').catch(()=>{});});
