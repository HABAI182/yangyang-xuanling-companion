use crate::preferences::Preferences;

pub const STATIC:bool=cfg!(feature="edition-static");
pub const BASIC:bool=cfg!(feature="edition-basic")&&!STATIC;
pub const NAME:&str=if STATIC{"static"}else if BASIC{"basic"}else{"full"};
pub const AUTOSTART_ENTRY:&str=if STATIC{"YangyangXuanlingStatic"}else if BASIC{"YangyangXuanlingBasic"}else{"YangyangXuanlingFull"};
pub fn action_allowed(action:&str)->bool{(!BASIC&&!STATIC)||action=="default"}
pub fn restrict(p:&mut Preferences){
 if BASIC||STATIC{
  p.bubbles_enabled=false;p.touch_enabled=false;p.idle_seconds=0;p.sleep_minutes=0;
  for slot in &mut p.shortcuts{slot.enabled=false;}
 }
 if STATIC{
  p.input_enabled=false;p.show_keys=false;p.idle_enabled=false;p.cursor_follow=false;p.gaze_return_enabled=false;
  p.gamepad_enabled=false;p.sfx_enabled=false;p.hover_fade=false;
  p.intensity=0.;p.keyboard_scale=0.;p.mouse_scale=0.;p.head_elasticity=0.;p.motion="off".into();
 }
}

#[cfg(test)]mod tests{
 use super::*;
 #[test]fn edition_controls_actions_and_restored_preferences(){
  let mut p=Preferences::default();p.shortcuts[0].enabled=true;restrict(&mut p);
  assert_eq!(p.bubbles_enabled,!BASIC&&!STATIC);assert_eq!(p.touch_enabled,!BASIC&&!STATIC);
  assert_eq!(p.shortcuts[0].enabled,!BASIC&&!STATIC);assert_eq!(action_allowed("smile"),!BASIC&&!STATIC);
  assert!(action_allowed("default"));assert_eq!(p.input_enabled,!STATIC);assert_eq!(p.show_keys,!STATIC);assert_eq!(p.cursor_follow,!STATIC);
  assert_eq!(p.size,420.);assert_eq!(p.gaze_idle_seconds,3.);
 }
 #[test]fn static_restoration_cannot_enable_animation_or_sound(){
  let mut p=Preferences::default();p.input_enabled=true;p.idle_enabled=true;p.cursor_follow=true;p.hover_fade=true;p.gamepad_enabled=true;p.sfx_enabled=true;p.motion="full".into();p.always_on_top=false;p.size=630.;restrict(&mut p);
  if STATIC{assert!(!p.input_enabled&&!p.idle_enabled&&!p.cursor_follow&&!p.hover_fade&&!p.gamepad_enabled&&!p.sfx_enabled);assert_eq!(p.motion,"off");assert_eq!(p.intensity,0.);}
  assert_eq!(p.size,630.);assert!(!p.always_on_top);
  assert_eq!(AUTOSTART_ENTRY,if STATIC{"YangyangXuanlingStatic"}else if BASIC{"YangyangXuanlingBasic"}else{"YangyangXuanlingFull"});
 }
}
