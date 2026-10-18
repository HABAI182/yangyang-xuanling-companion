use serde::{Deserialize, Serialize};

#[derive(Clone,Serialize,Deserialize,Debug)]
#[serde(rename_all="camelCase",default)]
pub struct Shortcut {pub enabled:bool,pub chord:String,pub action:String}
impl Default for Shortcut{fn default()->Self{Self{enabled:false,chord:String::new(),action:"smile".into()}}}
#[derive(Clone,Serialize,Deserialize,Debug)]
#[serde(rename_all="camelCase",default)]
pub struct Preferences {
 pub size:f64,pub intensity:f64,pub always_on_top:bool,pub click_through:bool,pub show_keys:bool,pub idle_enabled:bool,
 pub theme:String,pub accent:String,pub density:String,pub text_scale:f64,pub motion:String,pub fps:u32,
 pub keyboard_scale:f64,pub mouse_scale:f64,pub hand_speed:f64,pub head_elasticity:f64,pub cursor_follow:bool,pub gaze_scale:f64,pub gaze_return_enabled:bool,pub gaze_idle_seconds:f64,pub key_bubble_scale:f64,pub speech_bubble_scale:f64,
 pub multi_keys:bool,pub max_keys:u32,pub repeat_keys:bool,pub input_enabled:bool,pub input_mode:String,
 pub bubbles_enabled:bool,pub bubble_seconds:f64,pub idle_seconds:u32,pub sleep_minutes:u32,pub touch_enabled:bool,
 pub fullscreen_hide:bool,pub fullscreen_exceptions:Vec<String>,pub edge_snap:bool,pub hover_fade:bool,pub hover_delay:u32,pub hover_opacity:f64,
 pub gamepad_enabled:bool,pub sfx_enabled:bool,pub sfx_volume:f64,pub autostart:bool,pub shortcuts:Vec<Shortcut>,
}
impl Default for Preferences{fn default()->Self{Self{
 size:420.,intensity:1.,always_on_top:true,click_through:false,show_keys:true,idle_enabled:true,
 theme:"system".into(),accent:"blue".into(),density:"comfortable".into(),text_scale:1.,motion:"full".into(),fps:60,
 keyboard_scale:1.,mouse_scale:1.,hand_speed:1.,head_elasticity:0.6,cursor_follow:true,gaze_scale:2.1,gaze_return_enabled:true,gaze_idle_seconds:3.,key_bubble_scale:1.3,speech_bubble_scale:1.,
 multi_keys:false,max_keys:1,repeat_keys:false,input_enabled:true,input_mode:"keyboard_mouse".into(),
 bubbles_enabled:true,bubble_seconds:4.,idle_seconds:90,sleep_minutes:10,touch_enabled:true,
 fullscreen_hide:false,fullscreen_exceptions:vec![],edge_snap:true,hover_fade:false,hover_delay:500,hover_opacity:0.4,
 gamepad_enabled:false,sfx_enabled:false,sfx_volume:0.25,autostart:false,shortcuts:vec![Shortcut::default();25],
}}}
pub const ACTIONS:&[&str]=&["default","smile","think","surprised","resigned","blush","sleepy","serious","laugh","angry","pout","shy","wronged","proud","confused","starry","wind","nod","bird","cheer"];
pub fn shortcut_key(chord:&str)->Option<(usize,bool,bool,bool)>{
 let pieces:Vec<_>=chord.split('+').map(str::trim).collect();if pieces.len()<2{return None;}
 let mut ctrl=false;let mut alt=false;let mut shift=false;
 for p in &pieces[..pieces.len()-1]{match p.to_ascii_lowercase().as_str(){"ctrl"=>ctrl=true,"alt"=>alt=true,"shift"=>shift=true,_=>return None,}}
 if !ctrl&&!alt{return None;}
 let last=pieces.last()?.to_ascii_uppercase();let code=if last.len()==1&&last.as_bytes()[0].is_ascii_alphanumeric(){last.as_bytes()[0] as usize}
 else if let Some(f)=last.strip_prefix('F').and_then(|x|x.parse::<usize>().ok()){if !(1..=24).contains(&f){return None;}111+f}else{return None;};
 if ctrl&&alt&&code==89{return None;}Some((code,ctrl,alt,shift))
}
impl Preferences{
 pub fn validate(&mut self)->Result<(),String>{
  crate::edition::restrict(self);
  for (value,lo,hi) in [(&mut self.size,210.,840.),(&mut self.intensity,0.,1.6),(&mut self.text_scale,0.85,1.3),(&mut self.keyboard_scale,0.,1.6),(&mut self.mouse_scale,0.,1.6),(&mut self.hand_speed,0.5,2.),(&mut self.head_elasticity,0.,1.5),(&mut self.gaze_scale,0.5,3.2),(&mut self.gaze_idle_seconds,1.,15.),(&mut self.key_bubble_scale,0.8,1.8),(&mut self.speech_bubble_scale,0.8,1.6),(&mut self.bubble_seconds,2.,12.),(&mut self.hover_opacity,0.2,0.8),(&mut self.sfx_volume,0.,1.)]{if !value.is_finite(){return Err("设置数值无效".into());}*value=value.clamp(lo,hi);}
  self.max_keys=self.max_keys.clamp(1,6);self.hover_delay=self.hover_delay.clamp(250,1500);
  for (s,allowed,default) in [(&mut self.theme,&["system","light","dark"][..],"system"),(&mut self.accent,&["blue","violet","sage","coral"][..],"blue"),(&mut self.density,&["comfortable","compact"][..],"comfortable"),(&mut self.motion,&["full","low","off"][..],"full"),(&mut self.input_mode,&["keyboard_mouse","keyboard_only"][..],"keyboard_mouse")]{if !allowed.contains(&s.as_str()){*s=default.into();}}
  if ![30,60].contains(&self.fps){self.fps=60;}if ![0,60,90,180].contains(&self.idle_seconds){self.idle_seconds=90;}if ![0,5,10,15].contains(&self.sleep_minutes){self.sleep_minutes=10;}
  if self.fullscreen_exceptions.len()>32{return Err("全屏例外最多32个".into());}
  for item in &mut self.fullscreen_exceptions{*item=item.trim().to_lowercase();if !item.ends_with(".exe")||item.len()>124||item.len()<5||item.chars().any(|c|c.is_control()||"\\/:*?\"<>|".contains(c)){return Err("例外请填写程序文件名，例如 game.exe".into());}}
  self.fullscreen_exceptions.sort();self.fullscreen_exceptions.dedup();
  self.shortcuts.resize(25,Shortcut::default());self.shortcuts.truncate(25);let mut seen=std::collections::HashSet::new();
  for slot in &self.shortcuts{if !ACTIONS.contains(&slot.action.as_str()){return Err("快捷键动作无效".into());}if slot.chord.len()>48{return Err("快捷键过长".into());}if slot.enabled{let key=shortcut_key(&slot.chord).ok_or("快捷键请使用 Ctrl/Alt 加字母、数字或F键；Ctrl+Alt+Y 保留用于找回桌宠")?;if !seen.insert(key){return Err("已启用的快捷键不能重复".into());}}}
  Ok(())
 }
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn migration_preserves_explicit_old_settings(){let mut p:Preferences=serde_json::from_str(r#"{"showKeys":false,"alwaysOnTop":false,"size":420}"#).unwrap();p.validate().unwrap();assert!(!p.show_keys);assert!(!p.always_on_top);assert_eq!(p.shortcuts.len(),25);assert!(!p.repeat_keys);}
 #[test]fn shortcut_conflicts_and_recovery_chord_are_rejected(){assert!(shortcut_key("Ctrl+Alt+Y").is_none());let mut p=Preferences::default();p.shortcuts[0]=Shortcut{enabled:true,chord:"Ctrl+Alt+1".into(),action:"smile".into()};p.shortcuts[1]=p.shortcuts[0].clone();if crate::edition::BASIC||crate::edition::STATIC{assert!(p.validate().is_ok());assert!(p.shortcuts.iter().all(|s|!s.enabled));}else{assert!(p.validate().is_err());}assert!(shortcut_key("Alt+F12").is_some());}
 #[test]fn overlay_preferences_migrate_and_round_trip(){let mut p:Preferences=serde_json::from_str(r#"{"size":445.2,"showKeys":false}"#).unwrap();p.validate().unwrap();assert_eq!(p.gaze_scale,2.1);assert_eq!(p.key_bubble_scale,1.3);assert_eq!(p.speech_bubble_scale,1.);p.key_bubble_scale=1.8;p.speech_bubble_scale=0.9;let q:Preferences=serde_json::from_str(&serde_json::to_string(&p).unwrap()).unwrap();assert_eq!(q.size,445.2);assert!(!q.show_keys);assert_eq!(q.key_bubble_scale,1.8);assert_eq!(q.speech_bubble_scale,0.9);}
}
